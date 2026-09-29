export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, isAdmin } from '@/lib/authz'
import { analyzeFinishes } from '@/lib/ai-vision'
import { AiUnavailableError } from '@/lib/ai-sections'

/** v1.3 — IA nas fotos de uma amostra: grava aiAnalysis e preenche piso/forro/pintura quando vazios. */
export async function POST(req: NextRequest, { params }: { params: { id: string; sampleId: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const sample = await prisma.marketStudySample.findUnique({ where: { id: params.sampleId }, select: { studyId: true, photoUrl: true, finishes: true, study: { select: { agentId: true } } } })
  if (!sample || sample.studyId !== params.id) return NextResponse.json({ error: 'Amostra não encontrada' }, { status: 404 })
  if (sample.study.agentId !== auth.user.id && !isAdmin(auth.user)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  const body = await req.json().catch(() => ({})) as { urls?: string[] }
  const urls = [sample.photoUrl, ...(Array.isArray(body.urls) ? body.urls : [])].filter((u): u is string => typeof u === 'string' && !!u).slice(0, 6)
  try {
    const ia = await analyzeFinishes(urls)
    const fin = { ...((sample.finishes as Record<string, unknown>) ?? {}) }
    for (const k of ['piso', 'forro', 'pintura'] as const) if (!fin[k] && ia[k] && ia[k] !== 'não visível') fin[k] = ia[k]
    await prisma.marketStudySample.update({ where: { id: params.sampleId }, data: { aiAnalysis: ia as object, finishes: fin as object } })
    return NextResponse.json({ analysis: ia, finishes: fin })
  } catch (e) {
    if (e instanceof AiUnavailableError) return NextResponse.json({ error: e.message }, { status: 503 })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro na análise' }, { status: 500 })
  }
}
