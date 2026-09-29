export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendReportToOwner } from '@/lib/email'
import { checkRateLimit } from '@/lib/rateLimit'
import { getSessionUser, canManageProperty } from '@/lib/authz'

/**
 * v1.1 — Relatório do proprietário com senha de verdade.
 * - A senha é gerada pelo corretor (POST, com login), gravada como hash e enviada por e-mail.
 * - O GET só devolve os dados do relatório com a senha certa (ou para o corretor logado).
 * - Só saem os campos que o relatório usa (nada de comissão, proprietário ou documentos internos).
 */

function reportView(property: NonNullable<Awaited<ReturnType<typeof loadProperty>>>) {
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))
  return {
    id: property.id,
    ref: property.ref,
    slug: property.slug,
    title: property.title,
    propertyType: property.propertyType,
    transactionType: property.transactionType,
    purpose: property.purpose,
    status: property.status,
    price: num(property.price),
    totalArea: num(property.totalArea),
    usefulArea: num(property.usefulArea),
    condominiumFee: num(property.condominiumFee),
    iptu: num(property.iptu),
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    suites: property.suites,
    neighborhood: property.neighborhood,
    city: property.city,
    state: property.state,
    address: property.showFullAddress ? property.address : null,
    constructionYear: property.constructionYear,
    description: property.description,
    views: property.views,
    favorites: property.favorites,
    publishedAt: property.publishedAt,
    createdAt: property.createdAt,
    images: property.images,
    features: property.features,
    marketAnalyses: property.marketAnalyses,
    agent: property.agent,
  }
}

async function loadProperty(id: string) {
  return prisma.property.findUnique({
    where: { id },
    include: {
      images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 1 },
      features: true,
      marketAnalyses: {
        where: { status: 'COMPLETED' },
        orderBy: { generatedAt: 'desc' },
        take: 1,
      },
      agent: { select: { id: true, name: true, creci: true, company: true, phone: true, whatsapp: true, email: true, avatarUrl: true } },
    },
  })
}

/** GET — dados do relatório (valida a senha gravada) */
export async function GET(
  req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  if (!checkRateLimit(`relatorio:${ip}`, 20, 15 * 60_000)) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
  }

  const property = await loadProperty(params.propertyId)
  if (!property) return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })

  // Corretor logado com acesso ao imóvel não precisa de senha
  const user = await getSessionUser()
  const allowedByLogin = !!user && canManageProperty(user, property)

  if (!allowedByLogin) {
    const password = req.nextUrl.searchParams.get('senha') ?? ''
    if (!property.reportPasswordHash) {
      return NextResponse.json({ error: 'Este relatório ainda não tem senha. Peça ao corretor para gerar o acesso.' }, { status: 403 })
    }
    if (!/^\d{5}$/.test(password) || !(await bcrypt.compare(password, property.reportPasswordHash))) {
      return NextResponse.json({ error: 'Senha inválida' }, { status: 401 })
    }
  }

  return NextResponse.json({ property: reportView(property) })
}

/** POST — corretor gera (ou renova) a senha e envia o relatório por e-mail ao proprietário */
export async function POST(
  req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { ownerEmail?: string; ownerName?: string; sendEmail?: boolean }
  const property = await prisma.property.findUnique({
    where: { id: params.propertyId },
    select: { id: true, title: true, ref: true, agentId: true, secondaryAgentId: true },
  })
  if (!property) return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
  if (!canManageProperty(user, property)) return NextResponse.json({ error: 'Sem permissão para este imóvel' }, { status: 403 })

  const ownerEmail = typeof body.ownerEmail === 'string' ? body.ownerEmail.trim() : ''
  if (ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
  }

  // Senha nova de 5 dígitos a cada envio
  const password = String(Math.floor(10000 + Math.random() * 90000))
  await prisma.property.update({
    where: { id: property.id },
    data: { reportPasswordHash: await bcrypt.hash(password, 10), reportPasswordSetAt: new Date() },
  })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const reportUrl = `${siteUrl}/relatorio/${property.id}`

  let emailed = false
  if (ownerEmail && body.sendEmail !== false) {
    await sendReportToOwner({
      ownerEmail,
      ownerName: body.ownerName?.trim() || 'Proprietário',
      propertyTitle: property.title ?? property.ref,
      reportUrl,
      password,
    })
    emailed = !!process.env.SMTP_HOST
  }

  // A senha volta ao corretor uma única vez, para ele passar por WhatsApp se preferir
  return NextResponse.json({ ok: true, password, reportUrl, emailed })
}
