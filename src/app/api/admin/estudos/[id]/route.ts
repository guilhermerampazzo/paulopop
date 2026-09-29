export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, isAdmin } from '@/lib/authz'
import { computeStudy, distanceKm } from '@/lib/market-study'
import { loadStudy as load } from '@/lib/market-study-db'
import { stripHtml, limitString } from '@/lib/sanitize'

type Params = { params: { id: string } }

const STUDY_TEXT = ['title', 'preparedFor', 'ownerEmail', 'ownerPhone', 'intro', 'methodology', 'advertiser', 'address', 'neighborhood', 'city', 'state', 'zipCode', 'propertyType', 'purpose', 'transactionType', 'parkingType', 'floor', 'sunPosition', 'condition', 'renovation', 'renovationNotes', 'leisure', 'demand', 'demandNotes', 'notes', 'scenario', 'adjustNote'] as const
const STUDY_NUM = ['radiusKm', 'latitude', 'longitude', 'areaPrivate', 'areaTotal', 'condoFee', 'iptu', 'competitivePct', 'optimisticPct', 'outlierPct', 'adjustPct'] as const
const STUDY_INT = ['bedrooms', 'suites', 'bathrooms', 'parking', 'buildingFloors', 'age'] as const
const SAMPLE_TEXT = ['portal', 'url', 'advertiser', 'location', 'floor', 'sunPosition', 'renovation', 'notes', 'status', 'discardReason', 'photoUrl'] as const
const SAMPLE_NUM = ['price', 'areaPrivate', 'areaTotal', 'condoFee', 'distanceKm', 'latitude', 'longitude'] as const
const SAMPLE_INT = ['bedrooms', 'bathrooms', 'parking', 'age', 'daysListed'] as const

const num = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null)
const int = (v: unknown) => { const n = num(v); return n == null ? null : Math.round(n) }
const txt = (v: unknown, max = 500) => (v === null || v === undefined ? null : typeof v === 'string' ? limitString(stripHtml(v), max) || null : null)


async function guard(id: string) {
  const auth = await requireSession()
  if (auth.response) return { response: auth.response }
  const study = await load(id)
  if (!study) return { response: NextResponse.json({ error: 'Estudo não encontrado' }, { status: 404 }) }
  if (!isAdmin(auth.user) && study.agentId !== auth.user.id) return { response: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }) }
  return { user: auth.user, study }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const g = await guard(params.id)
  if (g.response) return g.response
  return NextResponse.json(g.study)
}

/** PUT: salva os dados do estudo e a lista completa de amostras; recalcula os resultados. */
export async function PUT(req: NextRequest, { params }: Params) {
  const g = await guard(params.id)
  if (g.response) return g.response
  const body = await req.json().catch(() => ({})) as Record<string, unknown> & { samples?: Array<Record<string, unknown>>; photos?: unknown; finishes?: unknown }

  const data: Record<string, unknown> = {}
  for (const k of STUDY_TEXT) if (k in body) data[k] = txt(body[k], k === 'intro' || k === 'methodology' || k === 'notes' ? 5000 : 300)
  for (const k of STUDY_NUM) if (k in body) data[k] = num(body[k])
  for (const k of STUDY_INT) if (k in body) data[k] = int(body[k])
  if ('elevator' in body) data.elevator = body.elevator === null || body.elevator === '' ? null : Boolean(body.elevator)
  if ('studyDate' in body && body.studyDate) { const d = new Date(String(body.studyDate)); if (!Number.isNaN(d.getTime())) data.studyDate = d }
  if ('photos' in body) data.photos = Array.isArray(body.photos) ? body.photos.filter(p => typeof p === 'string').slice(0, 20) : []
  if ('finishes' in body) data.finishes = body.finishes && typeof body.finishes === 'object' ? body.finishes : null
  if (!data.title && 'title' in body) data.title = 'Estudo de mercado'
  if (data.competitivePct == null && 'competitivePct' in body) data.competitivePct = 15
  if (data.optimisticPct == null && 'optimisticPct' in body) data.optimisticPct = 10
  if (data.outlierPct == null && 'outlierPct' in body) data.outlierPct = 30
  if (data.scenario && !['COMPETITIVE', 'MARKET', 'OPTIMISTIC'].includes(String(data.scenario))) data.scenario = 'MARKET'

  const study = await prisma.$transaction(async (tx) => {
    if (Array.isArray(body.samples)) {
      const keep: string[] = []
      const subjLat = num(body.latitude ?? g.study.latitude)
      const subjLng = num(body.longitude ?? g.study.longitude)
      for (let i = 0; i < Math.min(body.samples.length, 60); i++) {
        const s = body.samples[i]
        const sd: Record<string, unknown> = { studyId: params.id, order: i }
        for (const k of SAMPLE_TEXT) if (k in s) sd[k] = txt(s[k], k === 'notes' ? 2000 : k === 'url' || k === 'photoUrl' ? 1000 : 200)
        for (const k of SAMPLE_NUM) if (k in s) sd[k] = num(s[k])
        for (const k of SAMPLE_INT) if (k in s) sd[k] = int(s[k])
        if ('sameCondo' in s) sd.sameCondo = Boolean(s.sameCondo)
        if ('publishedAt' in s) { const d = s.publishedAt ? new Date(String(s.publishedAt)) : null; sd.publishedAt = d && !Number.isNaN(d.getTime()) ? d : null }
        if ('tags' in s) sd.tags = Array.isArray(s.tags) ? s.tags.filter(t => typeof t === 'string').slice(0, 10) : []
        if ('finishes' in s) sd.finishes = s.finishes && typeof s.finishes === 'object' ? s.finishes : null
        if (sd.status !== 'DISCARDED') sd.status = 'VALID'
        if (sd.distanceKm == null && subjLat != null && subjLng != null && sd.latitude != null && sd.longitude != null) {
          sd.distanceKm = distanceKm(subjLat, subjLng, sd.latitude as number, sd.longitude as number)
        }
        const existing = typeof s.id === 'string' ? await tx.marketStudySample.findFirst({ where: { id: s.id, studyId: params.id }, select: { id: true } }) : null
        const saved = existing
          ? await tx.marketStudySample.update({ where: { id: existing.id }, data: sd as never })
          : await tx.marketStudySample.create({ data: sd as never })
        keep.push(saved.id)
      }
      await tx.marketStudySample.deleteMany({ where: { studyId: params.id, id: { notIn: keep } } })
    }
    const merged = await tx.marketStudy.findUnique({ where: { id: params.id }, include: { samples: { orderBy: { order: 'asc' } } } })
    const results = computeStudy(
      (merged?.samples ?? []).map(s => ({ id: s.id, price: s.price ? Number(s.price) : null, areaPrivate: s.areaPrivate ? Number(s.areaPrivate) : null, status: s.status, daysListed: s.daysListed, publishedAt: s.publishedAt })),
      { areaPrivate: num(data.areaPrivate ?? merged?.areaPrivate) },
      {
        competitivePct: num(data.competitivePct ?? merged?.competitivePct) ?? 15,
        optimisticPct: num(data.optimisticPct ?? merged?.optimisticPct) ?? 10,
        outlierPct: num(data.outlierPct ?? merged?.outlierPct) ?? 30,
        scenario: String(data.scenario ?? merged?.scenario ?? 'MARKET'),
        adjustPct: num(data.adjustPct ?? merged?.adjustPct),
      }
    )
    return tx.marketStudy.update({ where: { id: params.id }, data: { ...data, results: results as never } as never })
  })

  const full = await load(study.id)
  return NextResponse.json(full)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const g = await guard(params.id)
  if (g.response) return g.response
  await prisma.marketStudy.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
