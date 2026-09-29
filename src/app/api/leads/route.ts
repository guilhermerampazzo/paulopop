export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendLeadNotificationToAgent, sendLeadConfirmationToContact } from '@/lib/email'
import { checkRateLimit } from '@/lib/rateLimit'
import { stripHtml, limitString } from '@/lib/sanitize'
import { requireSession, isAdmin } from '@/lib/authz'
import { SITE_URL } from '@/lib/site'

export async function POST(request: NextRequest) {
  // Rate limiting: máx 5 envios por IP por hora (5.4)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
  if (!checkRateLimit(`leads:${ip}`, 5, 3600_000)) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente mais tarde.' },
      { status: 429 }
    )
  }

  const body = await request.json()
  const { name, email, phone, message, propertyId } = body

  if (!name || !phone) {
    return NextResponse.json({ error: 'Nome e telefone obrigatórios' }, { status: 400 })
  }

  // Validação de tamanho e sanitização dos campos (5.4)
  if (typeof name !== 'string' || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }
  if (name.length > 150 || phone.length > 30 || (email && email.length > 200) || (message && message.length > 2000)) {
    return NextResponse.json({ error: 'Dados excedem o tamanho permitido' }, { status: 400 })
  }

  // Buscar dados do imóvel e do corretor responsável (v1.1: o lead vai para o corretor do imóvel)
  let propertyTitle: string | null = null
  let propertyRef: string | null = null
  let propertySlug: string | null = null
  let agentId: string | null = null
  let agentEmail: string | null = null
  let agentName: string | null = null
  if (propertyId && typeof propertyId === 'string') {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { title: true, ref: true, slug: true, agentId: true, agent: { select: { email: true, name: true, active: true } } },
    })
    propertyTitle = property?.title ?? null
    propertyRef = property?.ref ?? null
    propertySlug = property?.slug ?? null
    agentId = property?.agentId ?? null
    agentEmail = property?.agent?.active ? property.agent.email : null
    agentName = property?.agent?.name ?? null
  }

  const lead = await prisma.lead.create({
    data: {
      name: limitString(stripHtml(name), 150),
      email: email ? limitString(stripHtml(email), 200) : null,
      phone: limitString(stripHtml(phone), 30),
      message: message ? limitString(stripHtml(message), 2000) : null,
      propertyId: propertyRef ? propertyId : null,
      agentId,
      source: 'SITE',
      status: 'NEW',
    },
  })

  // Disparar e-mails em background (não bloqueia a resposta)
  void sendLeadNotificationToAgent({
    name, email, phone, message, propertyTitle, propertyRef, agentEmail, agentName,
    propertyUrl: propertySlug ? `${SITE_URL}/imoveis/${propertySlug}` : null,
  })
  if (email) {
    void sendLeadConfirmationToContact({ name, email, propertyTitle })
  }

  return NextResponse.json(lead, { status: 201 })
}

export async function GET() {
  // Só usuário logado vê a lista de contatos; corretor vê os seus e os dos seus imóveis
  const auth = await requireSession()
  if (auth.response) return auth.response
  const where = isAdmin(auth.user)
    ? {}
    : { OR: [{ agentId: auth.user.id }, { property: { agentId: auth.user.id } }] }
  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: {
      property: { select: { id: true, title: true, ref: true } },
    },
  })
  return NextResponse.json(leads)
}
