export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/authz'

/** v1.2 — unidades de um empreendimento para o cadastro do imóvel (bloco / andar / número). Só logado. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const units = await prisma.empreendimentoUnit.findMany({
    where: { empreendimentoId: params.id },
    orderBy: [{ block: { order: 'asc' } }, { floor: 'asc' }, { number: 'asc' }],
    select: {
      id: true, floor: true, number: true,
      block: { select: { id: true, name: true } },
      unitType: { select: { id: true, name: true, bedrooms: true, suites: true, bathrooms: true, area: true, parking: true, sunPosition: true } },
      properties: { select: { id: true, ref: true, status: true }, orderBy: { updatedAt: 'desc' }, take: 1 },
    },
  })
  return NextResponse.json({ units })
}
