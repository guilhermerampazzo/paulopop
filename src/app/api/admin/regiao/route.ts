export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, isAdmin, canManageProperty } from '@/lib/authz'
import { getOrCreateAreaInsight } from '@/lib/area-insight'
import { revalidateSite } from '@/lib/cache'

/** v1.3 — "Viver aqui": analisa a região de um endereço e liga o resultado ao imóvel/empreendimento/cidade. */
export async function POST(req: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const body = await req.json().catch(() => ({})) as { address?: string; target?: { kind: 'property' | 'empreendimento' | 'city'; id: string }; force?: boolean }
  const address = String(body.address ?? '').trim().slice(0, 300)
  if (address.length < 5) return NextResponse.json({ error: 'Informe o endereço' }, { status: 400 })

  const t = body.target
  if (t?.kind === 'property') {
    const p = await prisma.property.findUnique({ where: { id: t.id }, select: { agentId: true, secondaryAgentId: true } })
    if (!p) return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
    if (!canManageProperty(auth.user, p)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  } else if (t && !isAdmin(auth.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const insight = await getOrCreateAreaInsight(address, { force: !!body.force })
  if (t?.kind === 'property') await prisma.property.update({ where: { id: t.id }, data: { areaInsightId: insight.id } })
  if (t?.kind === 'empreendimento') await prisma.empreendimento.update({ where: { id: t.id }, data: { areaInsightId: insight.id } })
  if (t?.kind === 'city') await prisma.cityPage.update({ where: { id: t.id }, data: { areaInsightId: insight.id } })
  revalidateSite('properties', 'empreendimentos', 'config')
  return NextResponse.json({ insight, warning: insight.provider === 'manual' ? 'Sem chave do Google Maps (GOOGLE_MAPS_SERVER_KEY): preencha os destaques à mão.' : undefined })
}
