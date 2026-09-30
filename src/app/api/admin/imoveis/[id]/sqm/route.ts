export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, canManageProperty } from '@/lib/authz'
import { compareSqm } from '@/lib/property-compare'
import { SQM_TOLERANCE_PCT } from '@/lib/sqm-display'

/**
 * v1.4 — GET: médias automáticas de R$/m² (região e prédio) para o painel "Preço por m² comparado"
 * da ficha do imóvel. O corretor vê os números reais e a prévia do que o público verá.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const p = await prisma.property.findUnique({
    where: { id: params.id },
    select: { id: true, agentId: true, secondaryAgentId: true, price: true, usefulArea: true, totalArea: true, transactionType: true, city: true, neighborhood: true, empreendimentoId: true, empreendimento: { select: { name: true } } },
  })
  if (!p) return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
  if (!canManageProperty(auth.user, p)) return NextResponse.json({ error: 'Sem permissão para este imóvel' }, { status: 403 })
  const cmp = await compareSqm({
    id: p.id, price: p.price ? Number(p.price) : null, usefulArea: p.usefulArea ? Number(p.usefulArea) : null, totalArea: p.totalArea ? Number(p.totalArea) : null,
    transactionType: p.transactionType, city: p.city, neighborhood: p.neighborhood, empreendimentoId: p.empreendimentoId,
  }).catch(() => null)
  return NextResponse.json({
    own: cmp?.own ?? null,
    region: cmp?.region ?? null,
    building: cmp?.building ? { ...cmp.building, label: p.empreendimento?.name ?? 'o prédio' } : null,
    tolerancePct: SQM_TOLERANCE_PCT,
  })
}
