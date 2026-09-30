/**
 * v1.4 — Área de Inteligência: acesso ao banco (base de quadras, plano de busca do estudo).
 */
import { prisma } from '@/lib/prisma'
import seed from '@/data/samambaia-quadras.json'
import { buildSearchPlan, matchQuadra, normalizeCursor, type PlanStep, type QuadraRow, type SearchCursor } from './quadras'

export interface SearchParams {
  /** quadra do imóvel avaliando escolhida no painel (sobrepõe a detecção pelo endereço) */
  quadra?: string | null
  /** nome do condomínio/prédio para o passo "mesmo condomínio" */
  condo?: string | null
  /** portais na ordem de prioridade */
  portals?: string[]
  otherPortals?: string[]
  /** tolerância de área em % (padrão 30) */
  areaTolPct?: number | null
  /** tolerância de quartos (padrão 1) */
  bedroomsTol?: number | null
  /** idade máxima do anúncio em dias (padrão 180) */
  maxAdDays?: number | null
  /** regras livres do corretor para a pesquisa */
  rules?: string | null
}

export function normalizeSearchParams(raw: unknown): SearchParams {
  const p = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.replace(/<[^>]*>/g, '').trim().slice(0, max) : null)
  const num = (v: unknown, min: number, max: number) => { const n = Number(v); return v === null || v === undefined || v === '' || !Number.isFinite(n) ? null : Math.min(max, Math.max(min, n)) }
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map(x => x.trim().slice(0, 40)).slice(0, 12) : undefined)
  return {
    quadra: str(p.quadra, 40), condo: str(p.condo, 120), portals: list(p.portals), otherPortals: list(p.otherPortals),
    areaTolPct: num(p.areaTolPct, 5, 100), bedroomsTol: num(p.bedroomsTol, 0, 3), maxAdDays: num(p.maxAdDays, 15, 730), rules: str(p.rules, 1500),
  }
}

/** Carrega a base de Samambaia (350 quadras + observações por região) se ainda não estiver no banco. */
export async function ensureSeedLoaded(): Promise<{ loaded: number }> {
  const city = seed.city
  const count = await prisma.intelQuadra.count({ where: { city } })
  if (count > 0) return { loaded: 0 }
  await prisma.intelQuadra.createMany({
    data: seed.quadras.map(q => ({ city, sector: q.sector, series: q.series, quadra: q.quadra, prefix: q.prefix, number: q.number, type: q.type, searchTerms: q.searchTerms, mapX: q.mapX, mapY: q.mapY })),
    skipDuplicates: true,
  })
  for (const r of seed.regions) {
    await prisma.intelRegionNote.upsert({ where: { city_name: { city, name: r.name } }, update: {}, create: { city, name: r.name, series: r.series, confirmed: r.confirmed, market: r.market } })
  }
  return { loaded: seed.quadras.length }
}

const strip = (s: string | null | undefined) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Cidade da base de quadras que corresponde ao estudo (cidade ou bairro contêm o nome). */
export async function intelCityFor(study: { city?: string | null; neighborhood?: string | null; address?: string | null }): Promise<string | null> {
  await ensureSeedLoaded()
  const cities = await prisma.intelQuadra.findMany({ distinct: ['city'], select: { city: true } })
  const hay = [study.city, study.neighborhood, study.address].map(strip).join(' | ')
  return cities.map(c => c.city).find(c => hay.includes(strip(c))) ?? null
}

export async function quadrasOf(city: string): Promise<QuadraRow[]> {
  const rows = await prisma.intelQuadra.findMany({ where: { city, active: true }, orderBy: [{ series: 'asc' }, { number: 'asc' }, { quadra: 'asc' }] })
  return rows.map(r => ({ quadra: r.quadra, prefix: r.prefix, number: r.number, city: r.city, sector: r.sector, series: r.series, searchTerms: r.searchTerms, mapX: r.mapX, mapY: r.mapY, latitude: r.latitude, longitude: r.longitude }))
}

export interface StudyForSearch {
  id: string
  title: string
  address: string | null
  neighborhood: string | null
  city: string | null
  searchParams: unknown
  searchCursor: unknown
  targetSamples: number
  property?: { empreendimento?: { name: string } | null } | null
}

/** Plano de busca do estudo: quadra-base (escolhida ou detectada no endereço), condomínio e a lista de passos. */
export async function searchContext(study: StudyForSearch): Promise<{ plan: PlanStep[]; cursor: SearchCursor; params: SearchParams; base: QuadraRow | null; intelCity: string | null; condo: string | null }> {
  const params = normalizeSearchParams(study.searchParams)
  const intelCity = await intelCityFor(study)
  const quadras = intelCity ? await quadrasOf(intelCity) : []
  const base = quadras.length
    ? (params.quadra ? quadras.find(q => q.quadra.toLowerCase() === params.quadra!.toLowerCase()) ?? matchQuadra(params.quadra, quadras) : null)
      ?? matchQuadra([study.address, study.title, study.neighborhood].filter(Boolean).join(' · '), quadras)
    : null
  const condo = params.condo ?? study.property?.empreendimento?.name ?? null
  const plan = buildSearchPlan({ city: study.city ?? intelCity, neighborhood: study.neighborhood, condo, base, quadras })
  // o cursor é uma posição neste plano: se a quadra-base ou o condomínio mudaram (endereço corrigido), recomeça
  const key = `${base?.quadra ?? ''}|${(condo ?? '').toLowerCase()}`
  const saved = normalizeCursor(study.searchCursor)
  const cursor: SearchCursor = saved.key !== undefined && saved.key !== key ? { tier: 0, index: 0, done: [], key } : { ...saved, key }
  return { plan, cursor, params, base, intelCity, condo }
}
