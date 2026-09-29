export const dynamic = 'force-dynamic'

/**
 * v1.3 — POST /api/alertas (público): cria um PropertyAlert.
 * Corpo: { name?, phone, email?, criteria } — criteria ex.: { kind: 'price_drop', propertyId }.
 * Rate limit: 5 por IP por hora.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rateLimit'
import { stripHtml, limitString } from '@/lib/sanitize'

const ALLOWED_KINDS = new Set(['price_drop', 'new_listing', 'search'])

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (!checkRateLimit(`alertas:${ip}`, 5, 3600_000)) {
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente mais tarde.' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }) }

  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : ''
  const phoneDigits = phoneRaw.replace(/\D/g, '')
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return NextResponse.json({ error: 'Informe um telefone/WhatsApp válido' }, { status: 400 })
  }
  const name = typeof body.name === 'string' && body.name.trim() ? limitString(stripHtml(body.name.trim()), 150) : null
  const email = typeof body.email === 'string' && body.email.trim() ? limitString(stripHtml(body.email.trim()), 200) : null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
  }

  const rawCriteria = body.criteria && typeof body.criteria === 'object' ? (body.criteria as Record<string, unknown>) : {}
  const kind = typeof rawCriteria.kind === 'string' && ALLOWED_KINDS.has(rawCriteria.kind) ? rawCriteria.kind : 'price_drop'
  const criteria: Record<string, unknown> = { kind }

  if (kind === 'price_drop') {
    const propertyId = typeof rawCriteria.propertyId === 'string' ? rawCriteria.propertyId : ''
    if (!propertyId) return NextResponse.json({ error: 'Imóvel não informado' }, { status: 400 })
    const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, ref: true, price: true, status: true, hideOnSite: true } })
    if (!property || property.status !== 'ACTIVE' || property.hideOnSite) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
    }
    criteria.propertyId = property.id
    criteria.propertyRef = property.ref
    criteria.priceAtSignup = property.price ? Number(property.price) : null
  } else {
    // alertas de busca: copia só campos simples e curtos
    for (const k of ['transactionType', 'propertyType', 'city', 'neighborhood', 'empreendimentoId', 'text'] as const) {
      const v = rawCriteria[k]
      if (typeof v === 'string' && v.trim()) criteria[k] = limitString(stripHtml(v.trim()), 120)
    }
    for (const k of ['minPrice', 'maxPrice', 'bedrooms'] as const) {
      const v = Number(rawCriteria[k])
      if (Number.isFinite(v) && v >= 0) criteria[k] = v
    }
  }

  const alert = await prisma.propertyAlert.create({
    data: { name, phone: phoneDigits, email, criteria: criteria as never, source: 'site', active: true },
    select: { id: true },
  })
  return NextResponse.json({ ok: true, id: alert.id }, { status: 201 })
}
