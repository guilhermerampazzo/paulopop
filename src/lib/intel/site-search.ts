/**
 * v1.4 — Passo 1 da ordem de busca: o próprio site.
 * Procura comparáveis entre os anúncios do corretorpaulopop.com (ativos e vendidos) e no banco de
 * amostras (anúncios já lidos em estudos anteriores), na ordem: mesmo condomínio, mesma quadra,
 * mesma numeração e vizinhas mais próximas. O que achar entra no estudo como candidata (origem SITE).
 */
import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/site'
import { matchQuadra, nextSearchStep, type PlanStep, type QuadraRow } from './quadras'
import { quadrasOf, searchContext, type StudyForSearch } from './db'
import { registerCandidates, sampleCounts, type CandidateInput, type CandidateResult } from './candidates'
import { normalizeListingUrl } from './url-key'

const strip = (s: string | null | undefined) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Família do tipo do imóvel, para não comparar casa com apartamento. */
export function typeFamily(type: string | null | undefined): string | null {
  const t = strip(type)
  if (!t) return null
  if (/apart|apto|flat|studio|kit|loft|cobertura|duplex/.test(t)) return 'apartamento'
  if (/casa|sobrado|chacara|sitio/.test(t)) return 'casa'
  if (/lote|terreno/.test(t)) return 'lote'
  if (/sala|loja|comercial|galpao|predio|ponto/.test(t)) return 'comercial'
  return t.split(/\s+/)[0]
}

export interface SiteItem {
  key: string
  text: string            // endereço + título + bairro, para achar a quadra
  condoNames: string[]    // nomes de condomínio/empreendimento ligados ao anúncio
  quadra?: string | null  // quadra já conhecida (banco de amostras)
  neighborhood?: string | null
}

export interface SiteMatch<T extends SiteItem> { item: T; kind: PlanStep['kind']; quadra: string | null; distM: number | null; rank: number }

/**
 * Classifica os anúncios pela ordem do plano de busca. Fica de fora o que não está no mesmo condomínio,
 * na quadra, nas de mesma numeração nem numa vizinha até `maxDistM`. Sem base de quadras, vale o mesmo bairro.
 */
export function rankSiteMatches<T extends SiteItem>(items: T[], ctx: { plan: PlanStep[]; condo: string | null; quadras: QuadraRow[]; neighborhood?: string | null; maxDistM?: number }): SiteMatch<T>[] {
  const condo = strip(ctx.condo)
  const maxDist = ctx.maxDistM ?? 1500
  const byQuadra = new Map<string, { step: PlanStep; rank: number }>()
  ctx.plan.forEach((s, i) => { if (s.quadra && (s.kind === 'QUADRA' || s.kind === 'IRMA' || s.kind === 'VIZINHA') && !byQuadra.has(s.quadra)) byQuadra.set(s.quadra, { step: s, rank: i }) })
  const hood = strip(ctx.neighborhood)
  const out: SiteMatch<T>[] = []
  for (const item of items) {
    const q = item.quadra ? ctx.quadras.find(x => x.quadra.toLowerCase() === String(item.quadra).toLowerCase()) ?? matchQuadra(item.quadra, ctx.quadras) : matchQuadra(item.text, ctx.quadras)
    if (condo && condo.length >= 4 && (item.condoNames.some(n => strip(n).includes(condo) || (strip(n).length >= 4 && condo.includes(strip(n)))) || strip(item.text).includes(condo))) {
      out.push({ item, kind: 'CONDO', quadra: q?.quadra ?? null, distM: 0, rank: -1 })
      continue
    }
    const hit = q ? byQuadra.get(q.quadra) : undefined
    if (hit) {
      if (hit.step.kind === 'VIZINHA' && (hit.step.distM ?? Infinity) > maxDist) continue
      out.push({ item, kind: hit.step.kind, quadra: q!.quadra, distM: hit.step.distM, rank: hit.rank })
      continue
    }
    if (!byQuadra.size && hood && strip(item.neighborhood) === hood) out.push({ item, kind: 'BAIRRO', quadra: null, distM: null, rank: 9999 })
  }
  return out.sort((a, b) => a.rank - b.rank)
}

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v))
const brl = (v: number | null) => (v == null ? '' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v))
const dmy = (d: Date | null | undefined) => (d ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(d) : '')

export const STUDY_SEARCH_SELECT = {
  id: true, agentId: true, propertyId: true, title: true, address: true, neighborhood: true, city: true, propertyType: true, transactionType: true,
  areaPrivate: true, bedrooms: true, radiusKm: true, searchParams: true, searchCursor: true, targetSamples: true, searchStatus: true,
  property: { select: { empreendimento: { select: { name: true } } } },
} as const

export interface SiteSearchResult {
  found: number
  registered: number
  results: CandidateResult[]
  message: string
}

/** Roda a busca no próprio site para um estudo e registra as candidatas. `source`: MCP (conector) ou PANEL (painel). */
export async function searchOwnSite(studyId: string, source: 'MCP' | 'PANEL' = 'PANEL'): Promise<SiteSearchResult> {
  const study = await prisma.marketStudy.findUnique({ where: { id: studyId }, select: STUDY_SEARCH_SELECT })
  if (!study) throw new Error('Estudo não encontrado')
  const ctx = await searchContext(study as StudyForSearch)
  const quadras = ctx.intelCity ? await quadrasOf(ctx.intelCity) : []
  const counts = await sampleCounts(studyId)
  const missing = Math.max(0, study.targetSamples - counts.have)
  const family = typeFamily(study.propertyType)
  const maxDistM = Math.round((n(study.radiusKm) ?? 1.5) * 1000)
  const cityWord = (ctx.intelCity ?? study.city ?? '').replace(/\s*-\s*DF$/i, '').trim()
  const maxAdDays = ctx.params.maxAdDays ?? 180

  // 1. anúncios do site (ativos e vendidos/alugados)
  const tx = study.transactionType === 'RENT' ? 'RENT' : 'SALE'
  const props = cityWord ? await prisma.property.findMany({
    where: {
      id: study.propertyId ? { not: study.propertyId } : undefined, transactionType: tx, hideOnSite: false,
      status: { in: tx === 'RENT' ? ['ACTIVE', 'RENTED'] : ['ACTIVE', 'SOLD'] },
      OR: [{ city: { contains: cityWord, mode: 'insensitive' } }, { neighborhood: { contains: cityWord, mode: 'insensitive' } }],
    },
    select: {
      id: true, slug: true, ref: true, title: true, address: true, neighborhood: true, city: true, status: true, propertyType: true,
      price: true, salePrice: true, showSalePrice: true, soldAt: true, usefulArea: true, totalArea: true, bedrooms: true, suites: true, bathrooms: true, totalParkingSpots: true,
      floor: true, condominiumFee: true, publishedAt: true,
      empreendimento: { select: { name: true } }, condominium: { select: { name: true } },
      images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 1, select: { thumbnailUrl: true, url: true } },
    },
    orderBy: { updatedAt: 'desc' }, take: 800,
  }) : []
  const siteItems = props
    .filter(p => !family || !typeFamily(p.propertyType) || typeFamily(p.propertyType) === family)
    .map(p => ({ key: `p:${p.id}`, text: [p.address, p.title, p.neighborhood].filter(Boolean).join(' · '), condoNames: [p.empreendimento?.name, p.condominium?.name].filter((x): x is string => !!x), neighborhood: p.neighborhood, p }))

  // 2. banco de amostras (anúncios de portais já lidos em outros estudos)
  const since = new Date(Date.now() - maxAdDays * 86_400_000)
  const bank = cityWord ? await prisma.sampleBankItem.findMany({
    where: { lastSeenAt: { gte: since }, price: { not: null }, areaPrivate: { not: null }, OR: [{ city: { contains: cityWord, mode: 'insensitive' } }, { location: { contains: cityWord, mode: 'insensitive' } }] },
    orderBy: { lastSeenAt: 'desc' }, take: 800,
  }) : []
  const siteHost = new URL(SITE_URL).hostname.replace(/^www\./, '')
  const bankItems = bank
    .filter(b => !b.urlKey.startsWith(siteHost))
    .map(b => ({ key: `b:${b.id}`, text: [b.location, b.title, b.neighborhood].filter(Boolean).join(' · '), condoNames: [] as string[], quadra: b.quadra, neighborhood: b.neighborhood, b }))

  const rankCtx = { plan: ctx.plan, condo: ctx.condo, quadras, neighborhood: study.neighborhood, maxDistM }
  const siteMatches = rankSiteMatches(siteItems, rankCtx)
  const bankMatches = rankSiteMatches(bankItems, rankCtx)
  const found = siteMatches.length + bankMatches.length
  const limit = Math.min(20, missing + 5)

  const inputs: Array<{ cand: CandidateInput; quadra: string | null; rank: number }> = []
  for (const m of siteMatches) {
    const p = m.item.p
    const sold = p.status === 'SOLD' || p.status === 'RENTED'
    // valor de fechamento só entra quando o corretor marcou "mostrar valor final" na venda
    const closing = sold && p.showSalePrice ? n(p.salePrice) : null
    const price = closing ?? n(p.price)
    const area = n(p.usefulArea) ?? n(p.totalArea)
    inputs.push({
      quadra: m.quadra, rank: m.rank,
      cand: {
        url: `${SITE_URL}/imoveis/${p.slug}`, portal: 'corretorpaulopop.com', title: p.title, advertiser: 'Corretor Paulo Pop', location: [p.address, p.neighborhood].filter(Boolean).join(' · ') || p.title,
        city: p.city, neighborhood: p.neighborhood, quadra: m.quadra, price, areaPrivate: area, areaTotal: n(p.totalArea), bedrooms: p.bedrooms, suites: p.suites, bathrooms: p.bathrooms, parking: p.totalParkingSpots,
        floor: p.floor, condoFee: n(p.condominiumFee), publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null, photoUrl: p.images[0]?.thumbnailUrl ?? p.images[0]?.url ?? null, sameCondo: m.kind === 'CONDO',
        sourceText: `${p.ref} · ${p.title ?? ''} · ${brl(price)} · ${area ?? '?'} m²`,
        notes: sold ? `${p.status === 'RENTED' ? 'Alugado' : 'Vendido'} pelo site${p.soldAt ? ` em ${dmy(p.soldAt)}` : ''}${closing != null ? ' — valor de fechamento' : ' — valor do anúncio (valor de fechamento não divulgado)'}.` : 'Anúncio ativo no site.',
      },
    })
  }
  for (const m of bankMatches) {
    const b = m.item.b
    inputs.push({
      quadra: m.quadra, rank: m.rank,
      cand: {
        url: b.url, portal: b.portal, title: b.title, advertiser: b.advertiser, location: b.location, city: b.city, neighborhood: b.neighborhood, quadra: m.quadra ?? b.quadra,
        price: n(b.price), areaPrivate: n(b.areaPrivate), areaTotal: n(b.areaTotal), bedrooms: b.bedrooms, suites: b.suites, bathrooms: b.bathrooms, parking: b.parking, floor: b.floor, condoFee: n(b.condoFee),
        publishedAt: b.publishedAt ? b.publishedAt.toISOString() : null, photoUrl: b.photoUrl, sameCondo: m.kind === 'CONDO', sourceText: b.sourceText, collectedAt: b.lastSeenAt.toISOString(),
        notes: `Do banco de amostras: lido em ${dmy(b.lastSeenAt)}. Confira se o anúncio continua no ar.`,
      },
    })
  }

  // tira o que já está no estudo (inclusive o que foi recusado) ANTES de cortar a lista: assim, depois de uma
  // recusa, a próxima rodada traz os anúncios seguintes em vez de repetir os mesmos. Site e banco entram
  // juntos na ordem da busca (condomínio, quadra, mesma numeração, vizinhas).
  const inStudy = new Set<string>()
  for (const s of await prisma.marketStudySample.findMany({ where: { studyId }, select: { url: true, altUrls: true } })) {
    for (const u of [s.url, ...s.altUrls]) { const k = u ? normalizeListingUrl(u)?.urlKey : null; if (k) inStudy.add(k) }
  }
  const fresh = inputs
    .filter(it => { const k = normalizeListingUrl(it.cand.url)?.urlKey; return !!k && !inStudy.has(k) })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
  const results: CandidateResult[] = []
  let registered = 0
  if (missing > 0) {
    for (const it of fresh) {
      const r = await registerCandidates(studyId, [it.cand], { origin: 'SITE', step: 'SITE', quadra: it.quadra, areaTolPct: ctx.params.areaTolPct, bedroomsTol: ctx.params.bedroomsTol, maxAdDays })
      results.push(...r.results)
      registered += r.registered
    }
  }

  // o passo "site" fica concluído; a busca segue para os portais
  const step = ctx.plan[ctx.cursor.index]
  const next = step?.kind === 'SITE' && ctx.cursor.tier === 0
    ? nextSearchStep({ plan: ctx.plan, cursor: ctx.cursor, have: counts.have + registered, target: study.targetSamples, advance: true, priorityPortals: ctx.params.portals, otherPortals: ctx.params.otherPortals })
    : null
  await prisma.$transaction([
    prisma.studySearchRun.create({ data: { studyId, source, step: 'SITE', quadra: ctx.base?.quadra ?? null, portal: 'Site corretorpaulopop.com', query: [ctx.condo, ctx.base?.quadra, cityWord].filter(Boolean).join(' · ') || null, found, read: missing > 0 ? fresh.length : 0, registered } }),
    prisma.marketStudy.update({ where: { id: studyId }, data: { ...(next ? { searchCursor: next.cursor as never } : {}), searchStatus: counts.have + registered >= study.targetSamples ? 'DONE' : 'RUNNING' } }),
  ])
  const message = missing <= 0
    ? 'O estudo já tem o número de amostras pedido; nada foi registrado.'
    : found === 0
      ? 'Nenhum anúncio do site ou do banco de amostras serve de comparável para este imóvel. Siga para os portais.'
      : fresh.length === 0
        ? `${found} anúncio(s) do site/banco de amostras na região, todos já estão neste estudo. Siga para os portais.`
        : `${found} anúncio(s) do site/banco de amostras na região; ${registered} entraram como candidatas.`
  return { found, registered, results, message }
}
