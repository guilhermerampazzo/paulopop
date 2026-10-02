export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/authz'
import { empreendimentoFill } from '@/lib/empreendimento-fill'

/**
 * v1.5 — GET /api/admin/empreendimentos/{id}/preenchimento?unitId=…
 * Devolve o que o empreendimento (e a tipologia da unidade, quando informada) oferece ao imóvel:
 * campos, características, fotos e vídeo. Só leitura; quem decide o que entra é o formulário
 * (só campos vazios — veja applyEmpreendimentoFill).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response

  const emp = await prisma.empreendimento.findUnique({
    where: { id: params.id },
    include: { images: { orderBy: { order: 'asc' } } },
  })
  if (!emp) return NextResponse.json({ error: 'Empreendimento não encontrado' }, { status: 404 })

  const unitId = req.nextUrl.searchParams.get('unitId')
  const unit = unitId
    ? await prisma.empreendimentoUnit.findFirst({ where: { id: unitId, empreendimentoId: emp.id }, include: { unitType: true } })
    : null

  const fill = empreendimentoFill(
    {
      ...emp,
      condoFeeAvg: emp.condoFeeAvg != null ? Number(emp.condoFeeAvg) : null,
    },
    unit?.unitType
      ? {
          ...unit.unitType,
          area: unit.unitType.area != null ? Number(unit.unitType.area) : null,
          totalArea: unit.unitType.totalArea != null ? Number(unit.unitType.totalArea) : null,
        }
      : null,
    unit ? { floor: unit.floor, number: unit.number } : null,
  )
  return NextResponse.json({ empreendimento: { id: emp.id, name: emp.name }, unit: unit ? { id: unit.id, number: unit.number, unitType: unit.unitType?.name ?? null } : null, fill })
}
