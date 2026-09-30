/**
 * v1.4 — Candidatas a amostra de um estudo de mercado: registro (pelo conector do Claude, pelo painel
 * ou pela busca no próprio site), banco de amostras, junção de anúncios repetidos e recusa.
 *
 * Regras:
 *  - toda candidata precisa de link; as lidas pelo Claude também precisam do trecho de origem e da data da coleta;
 *  - campo que o anúncio não traz fica vazio (nada é estimado);
 *  - a candidata não entra no cálculo até o corretor aprovar;
 *  - o mesmo link nunca entra duas vezes no estudo; o mesmo imóvel em outro portal é juntado à amostra existente.
 */
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { stripHtml, limitString } from '@/lib/sanitize'
import { portalFromUrl, daysSince } from '@/lib/market-study'
import { normalizeListingUrl, externalIdFromUrl } from './url-key'
import { parseNumberBR } from './number'

export type CandidateOrigin = 'CLAUDE' | 'SITE' | 'LINK' | 'MANUAL'

export interface CandidateInput {
  url: string
  portal?: string | null
  title?: string | null
  advertiser?: string | null
  location?: string | null
  city?: string | null
  neighborhood?: string | null
  quadra?: string | null
  price?: number | null
  areaPrivate?: number | null
  areaTotal?: number | null
  bedrooms?: number | null
  suites?: number | null
  bathrooms?: number | null
  parking?: number | null
  floor?: string | null
  condoFee?: number | null
  publishedAt?: string | null
  daysListed?: number | null
  photoUrl?: string | null
  sameCondo?: boolean | null
  sourceText?: string | null
  notes?: string | null
  collectedAt?: string | null
}

export interface CandidateResult {
  url: string
  result: 'registrada' | 'atualizada' | 'mesclada' | 'ignorada'
  reason?: string
  sampleId?: string
  pricePerSqm?: number | null
  tags?: string[]
}

// corta antes de limpar: texto gigante não pode travar o servidor
const txt = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? limitString(stripHtml(v.slice(0, max * 3)).replace(/\s+/g, ' ').trim(), max) || null : null)
const num = (v: unknown, min: number, max: number): number | null => { const n = parseNumberBR(v); return n != null && n >= min && n <= max ? n : null }
const int = (v: unknown, min: number, max: number): number | null => { const n = num(v, min, max); return n == null ? null : Math.round(n) }
const date = (v: unknown): Date | null => { if (!v || typeof v !== 'string') return null; const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00.000Z` : v); return Number.isNaN(d.getTime()) || d.getTime() > Date.now() + 86_400_000 ? null : d }

export interface CleanCandidate {
  url: string; urlKey: string; portal: string; externalId: string | null
  title: string | null; advertiser: string | null; location: string | null; city: string | null; neighborhood: string | null; quadra: string | null
  price: number | null; areaPrivate: number | null; areaTotal: number | null; bedrooms: number | null; suites: number | null; bathrooms: number | null; parking: number | null
  floor: string | null; condoFee: number | null; publishedAt: Date | null; daysListed: number | null; photoUrl: string | null
  sameCondo: boolean; sourceText: string | null; notes: string | null; collectedAt: Date
}

/** Limpa e valida uma candidata. Devolve o motivo quando não pode entrar. */
export function cleanCandidate(raw: CandidateInput, origin: CandidateOrigin): { ok: true; data: CleanCandidate } | { ok: false; reason: string } {
  const norm = normalizeListingUrl(String(raw?.url ?? ''))
  if (!norm) return { ok: false, reason: 'Link do anúncio ausente ou inválido.' }
  const sourceText = txt(raw.sourceText, 1500)
  if (origin === 'CLAUDE' && (!sourceText || sourceText.length < 15)) return { ok: false, reason: 'Falta o trecho de origem (o texto do anúncio de onde saíram preço e área).' }
  const price = num(raw.price, 100, 500_000_000)
  const areaPrivate = num(raw.areaPrivate, 8, 100_000)
  if (price == null && areaPrivate == null) return { ok: false, reason: 'O anúncio não trouxe preço nem área: não serve de amostra.' }
  const photo = typeof raw.photoUrl === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(raw.photoUrl.trim()) ? raw.photoUrl.trim().slice(0, 1000) : (typeof raw.photoUrl === 'string' && raw.photoUrl.startsWith('/uploads/') ? raw.photoUrl : null)
  const publishedAt = date(raw.publishedAt)
  return {
    ok: true,
    data: {
      url: norm.url.slice(0, 1000), urlKey: norm.urlKey.slice(0, 600), portal: txt(raw.portal, 40) ?? portalFromUrl(norm.url), externalId: externalIdFromUrl(norm.url),
      title: txt(raw.title, 200), advertiser: txt(raw.advertiser, 200), location: txt(raw.location, 200) ?? txt(raw.title, 200), city: txt(raw.city, 80), neighborhood: txt(raw.neighborhood, 80), quadra: txt(raw.quadra, 40),
      price, areaPrivate, areaTotal: num(raw.areaTotal, 8, 1_000_000), bedrooms: int(raw.bedrooms, 0, 30), suites: int(raw.suites, 0, 30), bathrooms: int(raw.bathrooms, 0, 30), parking: int(raw.parking, 0, 50),
      floor: txt(raw.floor, 40), condoFee: num(raw.condoFee, 0, 100_000), publishedAt, daysListed: int(raw.daysListed, 0, 5000) ?? daysSince(publishedAt), photoUrl: photo,
      sameCondo: raw.sameCondo === true, sourceText, notes: txt(raw.notes, 1000), collectedAt: date(raw.collectedAt) ?? new Date(),
    },
  }
}

/** Mesmo imóvel anunciado em outro portal: preço e área iguais, mesmos quartos e (quando informada) mesma quadra. */
export function looksLikeSameListing(a: { price: number | null; areaPrivate: number | null; bedrooms: number | null; quadra?: string | null; floor?: string | null }, b: { price: number | null; areaPrivate: number | null; bedrooms: number | null; quadra?: string | null; floor?: string | null }): boolean {
  if (a.price == null || b.price == null || a.areaPrivate == null || b.areaPrivate == null) return false
  if (Math.abs(a.price - b.price) > 1) return false
  if (Math.abs(a.areaPrivate - b.areaPrivate) > 0.5) return false
  if (a.bedrooms != null && b.bedrooms != null && a.bedrooms !== b.bedrooms) return false
  if (a.quadra && b.quadra && a.quadra.toLowerCase() !== b.quadra.toLowerCase()) return false
  if (a.floor && b.floor && a.floor.toLowerCase() !== b.floor.toLowerCase()) return false
  return true
}

/** Etiquetas de alerta para o corretor decidir (não descartam nada sozinhas). */
export function candidateTags(c: { areaPrivate: number | null; price: number | null; daysListed: number | null; bedrooms: number | null }, subject: { areaPrivate: number | null; bedrooms: number | null }, opts: { areaTolPct?: number | null; bedroomsTol?: number | null; maxAdDays?: number | null } = {}): string[] {
  const tags: string[] = []
  if (c.areaPrivate == null) tags.push('sem área')
  if (c.price == null) tags.push('sem preço')
  if (c.areaPrivate != null && subject.areaPrivate) {
    const ratio = c.areaPrivate / subject.areaPrivate
    if (ratio < 0.5 || ratio > 2) tags.push('área fora da metade–dobro')
    else if (Math.abs(ratio - 1) * 100 > (opts.areaTolPct ?? 30)) tags.push('área fora da faixa pedida')
  }
  if (c.bedrooms != null && subject.bedrooms != null && Math.abs(c.bedrooms - subject.bedrooms) > (opts.bedroomsTol ?? 1)) tags.push('quartos diferentes')
  if (c.daysListed != null && c.daysListed > (opts.maxAdDays ?? 180)) tags.push('anúncio antigo')
  return tags
}

async function upsertBank(tx: Prisma.TransactionClient, c: CleanCandidate) {
  const existing = await tx.sampleBankItem.findUnique({ where: { urlKey: c.urlKey }, select: { id: true, price: true, priceHistory: true } })
  const entry = c.price != null ? { date: c.collectedAt.toISOString().slice(0, 10), price: c.price } : null
  const data = {
    url: c.url, portal: c.portal, externalId: c.externalId, title: c.title, advertiser: c.advertiser, location: c.location, city: c.city, neighborhood: c.neighborhood, quadra: c.quadra,
    price: c.price, areaPrivate: c.areaPrivate, areaTotal: c.areaTotal, bedrooms: c.bedrooms, suites: c.suites, bathrooms: c.bathrooms, parking: c.parking, floor: c.floor,
    condoFee: c.condoFee, publishedAt: c.publishedAt, photoUrl: c.photoUrl, sourceText: c.sourceText, lastSeenAt: c.collectedAt,
  }
  if (!existing) {
    return tx.sampleBankItem.create({ data: { urlKey: c.urlKey, ...data, firstSeenAt: c.collectedAt, priceHistory: entry ? [entry] : [] }, select: { id: true } })
  }
  const hist = Array.isArray(existing.priceHistory) ? (existing.priceHistory as Array<{ date: string; price: number }>) : []
  const changed = entry && (existing.price == null || Math.abs(Number(existing.price) - entry.price) > 1)
  // campos vazios na leitura nova não apagam o que já estava guardado
  const merged = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined))
  return tx.sampleBankItem.update({ where: { id: existing.id }, data: { ...merged, ...(changed ? { priceHistory: [...hist, entry].slice(-30) } : {}) }, select: { id: true } })
}

export interface RegisterContext {
  origin: CandidateOrigin
  step?: string | null
  quadra?: string | null
  areaTolPct?: number | null
  bedroomsTol?: number | null
  maxAdDays?: number | null
}

/** Registra um lote de candidatas num estudo. Tudo numa transação; cada item tem o seu resultado. */
export async function registerCandidates(studyId: string, items: CandidateInput[], ctx: RegisterContext): Promise<{ results: CandidateResult[]; registered: number }> {
  const study = await prisma.marketStudy.findUnique({ where: { id: studyId }, select: { id: true, areaPrivate: true, bedrooms: true, city: true } })
  if (!study) throw new Error('Estudo não encontrado')
  const subject = { areaPrivate: study.areaPrivate ? Number(study.areaPrivate) : null, bedrooms: study.bedrooms }
  const results: CandidateResult[] = []
  let registered = 0

  await prisma.$transaction(async tx => {
    // uma gravação por vez em cada estudo: duas chamadas ao mesmo tempo não duplicam o mesmo link
    await tx.$queryRaw`SELECT id FROM market_studies WHERE id = ${studyId} FOR UPDATE`
    const existing = await tx.marketStudySample.findMany({
      where: { studyId },
      select: { id: true, url: true, altUrls: true, bankId: true, price: true, areaPrivate: true, bedrooms: true, floor: true, foundAtQuadra: true, candidateStatus: true, order: true },
    })
    const byKey = new Map<string, (typeof existing)[number]>()
    for (const s of existing) for (const u of [s.url, ...(s.altUrls ?? [])]) { const k = u ? normalizeListingUrl(u)?.urlKey : null; if (k) byKey.set(k, s) }
    let order = existing.reduce((a, s) => Math.max(a, s.order), -1)
    const live = existing.map(s => ({ id: s.id, price: s.price ? Number(s.price) : null, areaPrivate: s.areaPrivate ? Number(s.areaPrivate) : null, bedrooms: s.bedrooms, floor: s.floor, quadra: s.foundAtQuadra, candidateStatus: s.candidateStatus, altUrls: s.altUrls ?? [] }))

    for (const raw of items.slice(0, 40)) {
      const cleaned = cleanCandidate(raw, ctx.origin)
      if (!cleaned.ok) { results.push({ url: String(raw?.url ?? ''), result: 'ignorada', reason: cleaned.reason }); continue }
      const c = cleaned.data
      const quadra = c.quadra ?? ctx.quadra ?? null
      const psqm = c.price != null && c.areaPrivate ? Math.round((c.price / c.areaPrivate) * 100) / 100 : null
      const tags = candidateTags(c, subject, ctx)
      // sem cidade informada, o anúncio fica com a cidade do estudo (as quadras repetem nome entre cidades do DF)
      const bank = await upsertBank(tx, { ...c, quadra, city: c.city ?? txt(study.city, 80) })
      const sampleData = {
        portal: c.portal, url: c.url, advertiser: c.advertiser, location: c.location, sameCondo: c.sameCondo,
        price: c.price, areaPrivate: c.areaPrivate, areaTotal: c.areaTotal, bedrooms: c.bedrooms, suites: c.suites, bathrooms: c.bathrooms, parking: c.parking,
        floor: c.floor, condoFee: c.condoFee, publishedAt: c.publishedAt, daysListed: c.daysListed, photoUrl: c.photoUrl, notes: c.notes,
        tags, collectedAt: c.collectedAt, sourceText: c.sourceText, foundAtStep: ctx.step ?? null, foundAtQuadra: quadra, bankId: bank.id,
      }

      const same = byKey.get(c.urlKey)
      if (same) {
        const primary = same.url ? normalizeListingUrl(same.url)?.urlKey : null
        if (primary !== c.urlKey) {
          // o link é um dos "outros portais" de uma amostra que já existe: nada a mudar
          results.push({ url: c.url, result: 'mesclada', sampleId: same.id, reason: 'Este link já está juntado a uma amostra do estudo.', pricePerSqm: psqm })
        } else if (same.candidateStatus === 'CANDIDATE') {
          await tx.marketStudySample.update({ where: { id: same.id }, data: sampleData })
          results.push({ url: c.url, result: 'atualizada', sampleId: same.id, pricePerSqm: psqm, tags })
        } else {
          results.push({ url: c.url, result: 'ignorada', sampleId: same.id, reason: same.candidateStatus === 'REJECTED' ? 'Este anúncio já foi recusado neste estudo.' : 'Este anúncio já está no estudo.' })
        }
        continue
      }
      const twin = live.find(s => looksLikeSameListing({ price: c.price, areaPrivate: c.areaPrivate, bedrooms: c.bedrooms, quadra, floor: c.floor }, s))
      if (twin) {
        const alt = Array.from(new Set([...twin.altUrls, c.url])).slice(0, 8)
        await tx.marketStudySample.update({ where: { id: twin.id }, data: { altUrls: alt } })
        twin.altUrls = alt
        results.push({ url: c.url, result: 'mesclada', sampleId: twin.id, reason: 'Mesmo imóvel de uma amostra que já está no estudo (preço, área e quartos iguais): o link foi juntado a ela.', pricePerSqm: psqm })
        continue
      }
      order += 1
      const created = await tx.marketStudySample.create({
        data: { studyId, order, ...sampleData, origin: ctx.origin, candidateStatus: 'CANDIDATE', status: 'VALID' },
        select: { id: true },
      })
      const entry = { id: created.id, url: c.url, altUrls: [] as string[], bankId: bank.id, price: null, areaPrivate: null, bedrooms: c.bedrooms, floor: c.floor, foundAtQuadra: quadra, candidateStatus: 'CANDIDATE', order } as unknown as (typeof existing)[number]
      byKey.set(c.urlKey, entry)
      live.push({ id: created.id, price: c.price, areaPrivate: c.areaPrivate, bedrooms: c.bedrooms, floor: c.floor, quadra, candidateStatus: 'CANDIDATE', altUrls: [] })
      registered += 1
      results.push({ url: c.url, result: 'registrada', sampleId: created.id, pricePerSqm: psqm, tags })
    }
    if (registered > 0) await tx.marketStudy.update({ where: { id: studyId }, data: { searchStatus: 'RUNNING' } })
  })
  return { results, registered }
}

/** Recusa uma amostra (candidata ou aprovada): sai do cálculo, guarda o motivo e reabre a busca. */
export async function rejectSample(studyId: string, sampleId: string, reason: string): Promise<{ ok: boolean; reason?: string }> {
  const why = txt(reason, 300)
  if (!why) return { ok: false, reason: 'Informe o motivo da recusa.' }
  const sample = await prisma.marketStudySample.findFirst({ where: { id: sampleId, studyId }, select: { id: true } })
  if (!sample) return { ok: false, reason: 'Amostra não encontrada neste estudo.' }
  await prisma.marketStudySample.update({ where: { id: sampleId }, data: { candidateStatus: 'REJECTED', status: 'DISCARDED', rejectedReason: why, discardReason: why, rejectedAt: new Date() } })
  await prisma.marketStudy.update({ where: { id: studyId }, data: { searchStatus: 'REQUESTED' } })
  return { ok: true }
}

/** Contagem usada pela ordem de busca: aprovadas que valem + candidatas esperando decisão. */
export async function sampleCounts(studyId: string): Promise<{ approved: number; candidates: number; rejected: number; have: number }> {
  const rows = await prisma.marketStudySample.findMany({ where: { studyId }, select: { candidateStatus: true, status: true, price: true, areaPrivate: true } })
  let approved = 0, candidates = 0, rejected = 0, have = 0
  for (const r of rows) {
    // só conta para a meta a amostra que pode entrar no cálculo (tem preço e área)
    const usable = r.price != null && r.areaPrivate != null
    if (r.candidateStatus === 'CANDIDATE') { candidates += 1; if (usable) have += 1 }
    else if (r.candidateStatus === 'REJECTED') rejected += 1
    else if (r.status !== 'DISCARDED') { approved += 1; if (usable) have += 1 }
  }
  return { approved, candidates, rejected, have }
}
