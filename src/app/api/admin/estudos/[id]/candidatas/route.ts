export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { readJsonObject } from '@/lib/json-body'
import { prisma } from '@/lib/prisma'
import { guardStudy } from '@/lib/study-guard'
import { rejectSample, sampleCounts } from '@/lib/intel/candidates'
import { recomputeStudy } from '@/lib/market-study-db'

/**
 * v1.4 — decisão do corretor sobre as candidatas a amostra.
 *   approve: a candidata passa a valer no cálculo;
 *   reject:  sai do cálculo com o motivo (fica guardada para a pesquisa não trazer de novo) e reabre a busca;
 *   restore: a recusada volta a ser candidata.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guardStudy(params.id)
  if (g.response) return g.response
  const body = await readJsonObject(req) as { action?: string; sampleId?: string; sampleIds?: string[]; reason?: string }
  const ids = (Array.isArray(body.sampleIds) ? body.sampleIds : [body.sampleId]).filter((x): x is string => typeof x === 'string' && !!x).slice(0, 60)
  if (typeof body.reason === 'string' && body.reason.length > 2000) body.reason = body.reason.slice(0, 2000)
  if (!ids.length) return NextResponse.json({ error: 'Informe a amostra.' }, { status: 400 })
  const owned = await prisma.marketStudySample.findMany({ where: { studyId: params.id, id: { in: ids } }, select: { id: true } })
  if (owned.length !== ids.length) return NextResponse.json({ error: 'Amostra não encontrada neste estudo.' }, { status: 404 })

  if (body.action === 'approve') {
    const max = await prisma.marketStudySample.aggregate({ where: { studyId: params.id, candidateStatus: 'APPROVED' }, _max: { order: true } })
    let order = (max._max.order ?? -1) + 1
    for (const id of ids) {
      await prisma.marketStudySample.update({ where: { id }, data: { candidateStatus: 'APPROVED', status: 'VALID', rejectedReason: null, rejectedAt: null, discardReason: null, order: order++ } })
    }
  } else if (body.action === 'reject') {
    for (const id of ids) {
      const r = await rejectSample(params.id, id, String(body.reason ?? ''))
      if (!r.ok) return NextResponse.json({ error: r.reason }, { status: 400 })
    }
  } else if (body.action === 'restore') {
    await prisma.marketStudySample.updateMany({ where: { studyId: params.id, id: { in: ids } }, data: { candidateStatus: 'CANDIDATE', status: 'VALID', rejectedReason: null, rejectedAt: null, discardReason: null } })
  } else {
    return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
  }
  const results = await recomputeStudy(params.id)
  const samples = await prisma.marketStudySample.findMany({ where: { studyId: params.id, id: { in: ids } } })
  return NextResponse.json({ ok: true, samples, counts: await sampleCounts(params.id), results })
}
