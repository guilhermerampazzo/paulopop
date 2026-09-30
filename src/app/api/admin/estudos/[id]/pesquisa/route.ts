export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { readJsonObject } from '@/lib/json-body'
import { prisma } from '@/lib/prisma'
import { guardStudy } from '@/lib/study-guard'
import { normalizeSearchParams, quadrasOf, searchContext, type StudyForSearch } from '@/lib/intel/db'
import { nextSearchStep, PRIORITY_PORTALS, OTHER_PORTALS } from '@/lib/intel/quadras'
import { sampleCounts } from '@/lib/intel/candidates'
import { searchOwnSite } from '@/lib/intel/site-search'
import { recomputeStudy } from '@/lib/market-study-db'
import { buildClaudePrompt } from '@/lib/intel/prompt'

type Params = { params: { id: string } }

async function view(studyId: string) {
  const study = await prisma.marketStudy.findUnique({
    where: { id: studyId },
    select: {
      id: true, title: true, address: true, neighborhood: true, city: true, searchParams: true, searchCursor: true, targetSamples: true, searchStatus: true, agentId: true,
      property: { select: { empreendimento: { select: { name: true } } } },
      // candidatas na ordem da busca: condomínio, quadra, mesma numeração, vizinhas
      samples: { where: { candidateStatus: { in: ['CANDIDATE', 'REJECTED'] } }, orderBy: [{ candidateStatus: 'asc' }, { order: 'asc' }] },
      searchRuns: { orderBy: { createdAt: 'desc' }, take: 40 },
    },
  })
  if (!study) return null
  const ctx = await searchContext(study as StudyForSearch)
  const counts = await sampleCounts(studyId)
  const next = nextSearchStep({ plan: ctx.plan, cursor: ctx.cursor, have: counts.have, target: study.targetSamples, priorityPortals: ctx.params.portals, otherPortals: ctx.params.otherPortals })
  const quadras = ctx.intelCity ? await quadrasOf(ctx.intelCity) : []
  const tokens = await prisma.apiToken.count({ where: { userId: study.agentId, revokedAt: null } })
  return {
    status: study.searchStatus, target: study.targetSamples, counts,
    params: { ...ctx.params, portals: ctx.params.portals?.length ? ctx.params.portals : [...PRIORITY_PORTALS], otherPortals: ctx.params.otherPortals ?? [...OTHER_PORTALS] },
    base: ctx.base?.quadra ?? null, baseDetected: !normalizeSearchParams(study.searchParams).quadra, intelCity: ctx.intelCity, condo: ctx.condo,
    quadraOptions: quadras.map(q => q.quadra),
    next: { done: next.done, reason: next.reason, label: next.step?.label ?? null, kind: next.step?.kind ?? null, quadra: next.step?.quadra ?? null, terms: next.step?.terms ?? [], portals: next.portals, missing: next.missing, position: next.position, tier: next.cursor.tier },
    plan: ctx.plan.slice(0, 60).map((s, i) => ({ label: s.label, kind: s.kind, passo: s.passo, current: i === next.cursor.index && !next.done, done: i < next.cursor.index || (next.cursor.tier === 1 && s.kind === 'SITE') })),
    planTotal: ctx.plan.length,
    candidates: study.samples.filter(s => s.candidateStatus === 'CANDIDATE'),
    rejected: study.samples.filter(s => s.candidateStatus === 'REJECTED'),
    runs: study.searchRuns,
    prompt: buildClaudePrompt(study, ctx.params.rules),
    connectorReady: tokens > 0,
  }
}

/** GET — tudo o que a aba "Pesquisa" do estudo mostra. */
export async function GET(_req: NextRequest, { params }: Params) {
  const g = await guardStudy(params.id)
  if (g.response) return g.response
  return NextResponse.json(await view(params.id))
}

/** PUT — salva meta e parâmetros da pesquisa; `request: true` marca o estudo como "pedindo pesquisa". */
export async function PUT(req: NextRequest, { params }: Params) {
  const g = await guardStudy(params.id)
  if (g.response) return g.response
  const body = await readJsonObject(req) as Record<string, unknown>
  const next = normalizeSearchParams(body.searchParams ?? g.study.searchParams)
  const prev = normalizeSearchParams(g.study.searchParams)
  const changedBase = (next.quadra ?? '') !== (prev.quadra ?? '') || (next.condo ?? '') !== (prev.condo ?? '')
  const target = 'targetSamples' in body ? Math.min(30, Math.max(3, Math.round(Number(body.targetSamples)) || 10)) : g.study.targetSamples
  await prisma.marketStudy.update({
    where: { id: params.id },
    data: {
      targetSamples: target, searchParams: next as never,
      ...(changedBase || body.restart === true ? { searchCursor: { tier: 0, index: 0, done: [] } } : {}),
      ...(body.request === true ? { searchStatus: 'REQUESTED' } : {}),
    },
  })
  return NextResponse.json(await view(params.id))
}

/** POST — ações do painel: `site` roda o passo 1 (busca no próprio site); `restart` recomeça a ordem de busca. */
export async function POST(req: NextRequest, { params }: Params) {
  const g = await guardStudy(params.id)
  if (g.response) return g.response
  const body = await readJsonObject(req) as { action?: string }
  let message: string | null = null
  if (body.action === 'site') {
    const r = await searchOwnSite(params.id, 'PANEL')
    message = r.message
  } else if (body.action === 'restart') {
    await prisma.marketStudy.update({ where: { id: params.id }, data: { searchCursor: { tier: 0, index: 0, done: [] }, searchStatus: 'REQUESTED' } })
    message = 'A ordem de busca recomeça do primeiro passo.'
  } else if (body.action === 'finish') {
    await prisma.marketStudy.update({ where: { id: params.id }, data: { searchStatus: 'DONE' } })
    message = 'Pesquisa marcada como concluída.'
  } else {
    return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
  }
  await recomputeStudy(params.id)
  return NextResponse.json({ ...(await view(params.id)), message })
}
