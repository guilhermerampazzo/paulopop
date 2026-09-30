export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, canManageProperty } from '@/lib/authz'
import { revalidateSite } from '@/lib/cache'
import { daysOnMarket, discount } from '@/lib/sales'
import { stripHtml, limitString } from '@/lib/sanitize'
import { needsPublishAuthorization } from '@/lib/property-compare'

const AUTH_MSG = 'Este imóvel foi importado de um portal e ainda não tem a confirmação de autorização. Confirme na ficha do imóvel (Salvar e Ativar) antes de registrar venda ou locação.'

/**
 * v1.1 — POST /api/imoveis/[id]/venda: marca o imóvel como vendido ou alugado
 * com data, valor final, desconto (calculado) e tempo de mercado (calculado).
 * DELETE: desfaz (volta para ACTIVE) mantendo o histórico na atividade.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response

  const property = await prisma.property.findUnique({
    where: { id: params.id },
    select: { id: true, ref: true, agentId: true, secondaryAgentId: true, price: true, transactionType: true, publishedAt: true, registrationDate: true, createdAt: true, status: true, sourcePortal: true, publishAuthConfirmedAt: true },
  })
  if (!property) return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
  if (!canManageProperty(auth.user, property)) return NextResponse.json({ error: 'Sem permissão para este imóvel' }, { status: 403 })
  // v1.4: vendido/alugado também aparece no site; importado de portal precisa da confirmação antes
  if (needsPublishAuthorization(property)) return NextResponse.json({ error: AUTH_MSG, needsPublishAuth: true }, { status: 409 })

  const body = await request.json().catch(() => ({})) as {
    soldAt?: string; salePrice?: number | string | null; listPrice?: number | string | null
    source?: string; notes?: string; showSalePrice?: boolean; kind?: 'SOLD' | 'RENTED'
  }

  const soldAt = body.soldAt ? new Date(body.soldAt) : new Date()
  if (Number.isNaN(soldAt.getTime())) return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
  if (soldAt.getTime() > Date.now() + 86_400_000) return NextResponse.json({ error: 'A data da venda não pode estar no futuro' }, { status: 400 })

  const listPrice = body.listPrice !== undefined && body.listPrice !== null && body.listPrice !== ''
    ? Number(body.listPrice)
    : property.price ? Number(property.price) : null
  const salePrice = body.salePrice !== undefined && body.salePrice !== null && body.salePrice !== '' ? Number(body.salePrice) : null
  if (salePrice !== null && (Number.isNaN(salePrice) || salePrice < 0)) return NextResponse.json({ error: 'Valor final inválido' }, { status: 400 })

  const disc = discount(listPrice, salePrice)
  const listedAt = property.publishedAt ?? property.registrationDate ?? property.createdAt
  const days = daysOnMarket(listedAt, soldAt)
  const status = body.kind === 'RENTED' || (body.kind !== 'SOLD' && property.transactionType === 'RENT') ? 'RENTED' : 'SOLD'

  const updated = await prisma.property.update({
    where: { id: property.id },
    data: {
      status,
      soldAt,
      listPriceAtSale: listPrice,
      salePrice,
      saleDiscountPct: disc?.pct ?? null,
      saleDiscountValue: disc?.value ?? null,
      saleSource: body.source ? limitString(stripHtml(String(body.source)), 40) : null,
      saleNotes: body.notes ? limitString(stripHtml(String(body.notes)), 2000) : null,
      showSalePrice: Boolean(body.showSalePrice),
      daysOnMarket: days,
    },
    select: { id: true, status: true, soldAt: true, listPriceAtSale: true, salePrice: true, saleDiscountPct: true, saleDiscountValue: true, daysOnMarket: true, saleSource: true, saleNotes: true, showSalePrice: true },
  })

  await prisma.activity.create({
    data: {
      propertyId: property.id,
      userId: auth.user.id,
      type: 'PROPERTY_SOLD',
      description: `${status === 'RENTED' ? 'Alugado' : 'Vendido'} em ${soldAt.toLocaleDateString('pt-BR')}${salePrice !== null ? ` por R$ ${salePrice.toLocaleString('pt-BR')}` : ''}${disc ? ` (desconto de ${disc.pct}%)` : ''}${days !== null ? ` · ${days} dias no mercado` : ''}`,
      metadata: { status, soldAt, listPrice, salePrice, discountPct: disc?.pct ?? null, daysOnMarket: days, source: body.source ?? null },
    },
  })

  revalidateSite('properties')
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const property = await prisma.property.findUnique({ where: { id: params.id }, select: { id: true, agentId: true, secondaryAgentId: true, status: true, sourcePortal: true, publishAuthConfirmedAt: true } })
  if (!property) return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
  if (!canManageProperty(auth.user, property)) return NextResponse.json({ error: 'Sem permissão para este imóvel' }, { status: 403 })
  // v1.4: desfazer venda só vale para imóvel vendido/alugado e nunca publica importado sem confirmação
  if (property.status !== 'SOLD' && property.status !== 'RENTED') return NextResponse.json({ error: 'Este imóvel não está marcado como vendido ou alugado.' }, { status: 400 })
  if (needsPublishAuthorization(property)) return NextResponse.json({ error: AUTH_MSG, needsPublishAuth: true }, { status: 409 })

  await prisma.property.update({
    where: { id: property.id },
    data: { status: 'ACTIVE', soldAt: null, listPriceAtSale: null, salePrice: null, saleDiscountPct: null, saleDiscountValue: null, saleSource: null, saleNotes: null, showSalePrice: false, daysOnMarket: null },
  })
  await prisma.activity.create({
    data: { propertyId: property.id, userId: auth.user.id, type: 'PROPERTY_UPDATED', description: 'Venda/locação desfeita: imóvel voltou a ficar ativo' },
  })
  revalidateSite('properties')
  return NextResponse.json({ ok: true })
}
