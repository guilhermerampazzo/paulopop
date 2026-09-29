export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, isAdmin } from '@/lib/authz'
import { analyzeFinishes } from '@/lib/ai-vision'
import { AiUnavailableError } from '@/lib/ai-sections'

/** v1.3 — IA nas fotos do imóvel avaliado: preenche os acabamentos vazios e guarda a análise em finishes.ia. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const study = await prisma.marketStudy.findUnique({ where: { id: params.id }, select: { agentId: true, photos: true, finishes: true } })
  if (!study) return NextResponse.json({ error: 'Estudo não encontrado' }, { status: 404 })
  if (study.agentId !== auth.user.id && !isAdmin(auth.user)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  const body = await req.json().catch(() => ({})) as { urls?: string[] }
  const urls = [...(Array.isArray(study.photos) ? (study.photos as string[]) : []), ...(Array.isArray(body.urls) ? body.urls.filter(u => typeof u === 'string') : [])]
  try {
    const ia = await analyzeFinishes(urls)
    const fin = { ...((study.finishes as Record<string, unknown>) ?? {}) }
    for (const k of ['piso', 'forro', 'pintura', 'armarios', 'esquadrias'] as const) if (!fin[k] && ia[k] && ia[k] !== 'não visível') fin[k] = ia[k]
    fin.ia = ia
    await prisma.marketStudy.update({ where: { id: params.id }, data: { finishes: fin as object } })
    return NextResponse.json({ analysis: ia, finishes: fin })
  } catch (e) {
    if (e instanceof AiUnavailableError) return NextResponse.json({ error: e.message }, { status: 503 })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro na análise' }, { status: 500 })
  }
}
