export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/authz'
import { revalidateSite } from '@/lib/cache'
import { generateUnitNumbers, pickUnitType } from '@/lib/empreendimento-units'
import { stripHtml, limitString } from '@/lib/sanitize'

type Params = { params: { id: string } }

/**
 * v1.2 — Estrutura do empreendimento.
 * GET: blocos, tipologias e unidades (com o imóvel ligado a cada unidade).
 * PUT: salva blocos e tipologias e (re)gera a matriz de unidades sem apagar unidades que têm imóvel ligado.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const data = await loadStructure(params.id)
  if (!data) return NextResponse.json({ error: 'Empreendimento não encontrado' }, { status: 404 })
  return NextResponse.json(data)
}

async function loadStructure(id: string) {
  const emp = await prisma.empreendimento.findUnique({ where: { id }, select: { id: true } })
  if (!emp) return null
  const [blocks, unitTypes, units] = await Promise.all([
    prisma.empreendimentoBlock.findMany({ where: { empreendimentoId: id }, orderBy: { order: 'asc' } }),
    prisma.empreendimentoUnitType.findMany({ where: { empreendimentoId: id }, orderBy: { order: 'asc' } }),
    prisma.empreendimentoUnit.findMany({
      where: { empreendimentoId: id },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      include: { properties: { select: { id: true, ref: true, status: true, transactionType: true, price: true, slug: true }, orderBy: { updatedAt: 'desc' }, take: 1 } },
    }),
  ])
  return { blocks, unitTypes, units }
}

interface BlockIn { id?: string; name: string; floors: number; unitsPerFloor: number; firstFloor?: number; numbering?: string; order?: number }
interface TypeIn { id?: string; name: string; bedrooms?: number | null; suites?: number | null; bathrooms?: number | null; area?: number | null; parking?: number | null; sunPosition?: string | null; floorPlanUrl?: string | null; finals?: string | null; order?: number
  // v1.4
  floorsLabel?: string | null; totalArea?: number | null; balconies?: number | null; priceFrom?: number | null; description?: string | null }

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const emp = await prisma.empreendimento.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!emp) return NextResponse.json({ error: 'Empreendimento não encontrado' }, { status: 404 })

  const body = await req.json().catch(() => ({})) as { blocks?: BlockIn[]; unitTypes?: TypeIn[]; regenerate?: boolean }
  const blocksIn = Array.isArray(body.blocks) ? body.blocks : []
  const typesIn = Array.isArray(body.unitTypes) ? body.unitTypes : []
  const int = (v: unknown, min = 0, max = 999) => { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : null }
  const txt = (v: unknown, max = 120) => (typeof v === 'string' && v.trim() ? limitString(stripHtml(v.trim()), max) : null)
  const dec = (v: unknown) => { if (v === null || v === undefined || v === '') return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : null }

  const result = await prisma.$transaction(async (tx) => {
    // Tipologias
    const keepTypeIds: string[] = []
    for (let i = 0; i < typesIn.length; i++) { const t = typesIn[i]
      const name = txt(t.name) ?? `Tipologia ${i + 1}`
      const data = {
        empreendimentoId: params.id, name, order: i,
        bedrooms: int(t.bedrooms, 0, 20), suites: int(t.suites, 0, 20), bathrooms: int(t.bathrooms, 0, 20), parking: int(t.parking, 0, 20),
        area: t.area != null && t.area !== ('' as unknown) ? Number(t.area) : null,
        sunPosition: txt(t.sunPosition, 60), floorPlanUrl: txt(t.floorPlanUrl, 500), finals: txt(t.finals, 200),
        // v1.4: tipologia completa
        floorsLabel: txt(t.floorsLabel, 80), balconies: int(t.balconies, 0, 20), description: txt(t.description, 1000),
        totalArea: dec(t.totalArea), priceFrom: dec(t.priceFrom),
      }
      const saved = t.id
        ? await tx.empreendimentoUnitType.update({ where: { id: t.id }, data }).catch(() => tx.empreendimentoUnitType.create({ data }))
        : await tx.empreendimentoUnitType.create({ data })
      keepTypeIds.push(saved.id)
    }
    await tx.empreendimentoUnitType.deleteMany({ where: { empreendimentoId: params.id, id: { notIn: keepTypeIds } } })
    const types = await tx.empreendimentoUnitType.findMany({ where: { empreendimentoId: params.id }, orderBy: { order: 'asc' } })

    // Blocos
    const keepBlockIds: string[] = []
    for (let i = 0; i < blocksIn.length; i++) { const b = blocksIn[i]
      const data = {
        empreendimentoId: params.id,
        name: txt(b.name, 60) ?? `Bloco ${i + 1}`,
        floors: int(b.floors, 1, 200) ?? 1,
        unitsPerFloor: int(b.unitsPerFloor, 1, 60) ?? 4,
        firstFloor: int(b.firstFloor, 0, 5) ?? 1,
        numbering: b.numbering === 'SEQ' ? 'SEQ' : 'FLOOR_SEQ',
        order: i,
      }
      const saved = b.id
        ? await tx.empreendimentoBlock.update({ where: { id: b.id }, data }).catch(() => tx.empreendimentoBlock.create({ data }))
        : await tx.empreendimentoBlock.create({ data })
      keepBlockIds.push(saved.id)
    }
    await tx.empreendimentoBlock.deleteMany({ where: { empreendimentoId: params.id, id: { notIn: keepBlockIds } } })

    // Unidades: gera a matriz de cada bloco; mantém as que já existem (e as ligadas a imóveis)
    const blocks = await tx.empreendimentoBlock.findMany({ where: { empreendimentoId: params.id } })
    let created = 0
    for (const b of blocks) {
      const wanted = generateUnitNumbers({ floors: b.floors, unitsPerFloor: b.unitsPerFloor, firstFloor: b.firstFloor, numbering: b.numbering as 'FLOOR_SEQ' | 'SEQ' })
      const existing = await tx.empreendimentoUnit.findMany({ where: { blockId: b.id }, select: { id: true, number: true, unitTypeId: true } })
      const byNumber = new Map(existing.map(u => [u.number, u]))
      const toCreate = wanted.filter(w => !byNumber.has(w.number)).map(w => ({
        empreendimentoId: params.id, blockId: b.id, floor: w.floor, number: w.number, unitTypeId: pickUnitType(w.number, types),
      }))
      if (toCreate.length) { await tx.empreendimentoUnit.createMany({ data: toCreate }); created += toCreate.length }
      // Unidades fora da matriz nova e sem imóvel ligado são removidas
      const wantedSet = new Set(wanted.map(w => w.number))
      const extra = existing.filter(u => !wantedSet.has(u.number)).map(u => u.id)
      if (extra.length) {
        const linked = await tx.property.findMany({ where: { unitId: { in: extra } }, select: { unitId: true } })
        const linkedIds = new Set(linked.map(l => l.unitId))
        await tx.empreendimentoUnit.deleteMany({ where: { id: { in: extra.filter(id => !linkedIds.has(id)) } } })
      }
      // Reaplica a tipologia pelos finais quando pedido (ou quando a unidade ainda não tem)
      const all = await tx.empreendimentoUnit.findMany({ where: { blockId: b.id }, select: { id: true, number: true, unitTypeId: true } })
      for (const u of all) {
        const t = pickUnitType(u.number, types)
        if ((body.regenerate || !u.unitTypeId) && t !== u.unitTypeId) await tx.empreendimentoUnit.update({ where: { id: u.id }, data: { unitTypeId: t } })
      }
    }
    // totalUnits do empreendimento acompanha a matriz
    const total = await tx.empreendimentoUnit.count({ where: { empreendimentoId: params.id } })
    if (total > 0) await tx.empreendimento.update({ where: { id: params.id }, data: { totalUnits: total } })
    return { created, total }
  })

  revalidateSite('empreendimentos')
  const data = await loadStructure(params.id)
  return NextResponse.json({ ...data, ...result })
}
