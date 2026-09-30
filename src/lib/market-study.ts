/**
 * v1.2 — Estudo de mercado no padrão RE/MAX: estatística das amostras e valores sugeridos.
 * Base: média do R$/m² (área privativa) das amostras válidas × área privativa do imóvel avaliado.
 */

export interface SampleInput {
  id?: string
  price: number | null
  areaPrivate: number | null
  status?: string | null      // VALID | DISCARDED
  daysListed?: number | null
  publishedAt?: string | Date | null
  /** v1.4 — CANDIDATE | APPROVED | REJECTED. Só as aprovadas entram no cálculo e no relatório. */
  candidateStatus?: string | null
}

/** v1.4 — amostra aprovada pelo corretor (as antigas, sem o campo, contam como aprovadas). */
export const isApprovedSample = (s: { candidateStatus?: string | null }) => !s.candidateStatus || s.candidateStatus === 'APPROVED'

export interface SampleStat {
  id?: string
  index: number
  price: number | null
  areaPrivate: number | null
  pricePerSqm: number | null
  deviationPct: number | null   // desvio em relação à média das válidas
  valid: boolean                // entra no cálculo
  outlier: boolean              // fora de ±outlierPct (só aviso; entra se status VALID)
  daysListed: number | null
  oldListing: boolean           // > 180 dias
}

export interface StudyResults {
  n: number
  nValid: number
  mean: number | null
  median: number | null
  std: number | null
  cv: number | null            // coeficiente de variação em %
  min: number | null
  max: number | null
  areaPrivate: number | null
  values: { competitive: number | null; market: number | null; optimistic: number | null }
  perSqm: { competitive: number | null; market: number | null; optimistic: number | null }
  scenario: 'COMPETITIVE' | 'MARKET' | 'OPTIMISTIC'
  suggested: number | null
  adjustPct: number | null
  samples: SampleStat[]
  oldListings: number
  computedAt: string
}

export function daysSince(date: string | Date | null | undefined): number | null {
  if (!date) return null
  const t = new Date(date).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.round((Date.now() - t) / 86_400_000))
}

const round2 = (v: number) => Math.round(v * 100) / 100

export function computeStudy(
  samples: SampleInput[],
  subject: { areaPrivate: number | null },
  opts: { competitivePct?: number; optimisticPct?: number; outlierPct?: number; scenario?: string; adjustPct?: number | null } = {}
): StudyResults {
  const competitivePct = opts.competitivePct ?? 15
  const optimisticPct = opts.optimisticPct ?? 10
  const outlierPct = opts.outlierPct ?? 30
  const scenario = (['COMPETITIVE', 'MARKET', 'OPTIMISTIC'].includes(opts.scenario ?? '') ? opts.scenario : 'MARKET') as StudyResults['scenario']

  // v1.4: candidatas (aguardando o corretor) e recusadas ficam fora do cálculo e da numeração
  const rows: SampleStat[] = samples.filter(isApprovedSample).map((s, i) => {
    const days = s.daysListed ?? daysSince(s.publishedAt)
    const psqm = s.price && s.areaPrivate ? s.price / s.areaPrivate : null
    return {
      id: s.id, index: i + 1, price: s.price, areaPrivate: s.areaPrivate, pricePerSqm: psqm ? round2(psqm) : null,
      deviationPct: null, valid: (s.status ?? 'VALID') !== 'DISCARDED' && !!psqm, outlier: false,
      daysListed: days, oldListing: days != null && days > 180,
    }
  })
  const vals = rows.filter(r => r.valid).map(r => r.pricePerSqm as number)
  const n = vals.length
  const mean = n ? vals.reduce((a, b) => a + b, 0) / n : null
  const sorted = [...vals].sort((a, b) => a - b)
  const median = n ? (n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2) : null
  const std = n > 1 && mean != null ? Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : n === 1 ? 0 : null
  const cv = mean && std != null ? (std / mean) * 100 : null
  for (const r of rows) {
    if (r.pricePerSqm != null && mean) {
      r.deviationPct = round2(((r.pricePerSqm - mean) / mean) * 100)
      r.outlier = Math.abs(r.deviationPct) > outlierPct
    }
  }
  const area = subject.areaPrivate
  const perSqm = {
    market: mean != null ? round2(mean) : null,
    competitive: mean != null ? round2(mean * (1 - competitivePct / 100)) : null,
    optimistic: mean != null ? round2(mean * (1 + optimisticPct / 100)) : null,
  }
  const values = {
    market: perSqm.market != null && area ? round2(perSqm.market * area) : null,
    competitive: perSqm.competitive != null && area ? round2(perSqm.competitive * area) : null,
    optimistic: perSqm.optimistic != null && area ? round2(perSqm.optimistic * area) : null,
  }
  const base = scenario === 'COMPETITIVE' ? values.competitive : scenario === 'OPTIMISTIC' ? values.optimistic : values.market
  const adjustPct = opts.adjustPct ?? null
  const suggested = base != null ? round2(base * (1 + (adjustPct ?? 0) / 100)) : null

  return {
    n: rows.length, nValid: n, mean: mean != null ? round2(mean) : null, median: median != null ? round2(median) : null,
    std: std != null ? round2(std) : null, cv: cv != null ? round2(cv) : null,
    min: n ? round2(sorted[0]) : null, max: n ? round2(sorted[n - 1]) : null,
    areaPrivate: area, values, perSqm, scenario, suggested, adjustPct,
    samples: rows, oldListings: rows.filter(r => r.oldListing).length, computedAt: new Date().toISOString(),
  }
}

/** Distância em km entre duas coordenadas (Haversine). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return round2(2 * R * Math.asin(Math.sqrt(a)))
}

export const DEFAULT_INTRO = 'O estudo é uma análise comparativa de imóveis anunciados/vendidos com características similares para obter maior clareza da oferta do seu imóvel para o mercado. As informações são estudadas e analisadas para que a precificação seja assertiva e não sofra baixo interesse e ofertas indesejadas ou até mesmo uma percepção negativa do mercado em relação ao imóvel.'

export const DEFAULT_METHODOLOGY = `1. Coleta de dados: informações do imóvel (localização, características, estado de conservação) e do mercado local (tendências de preço, oferta, demanda).
2. Seleção de amostras: pesquisa nos portais (DF Imóveis, WImóveis, OLX, VivaReal, ZAP, Imovelweb, Chaves na Mão e outros) de imóveis semelhantes num raio de até 1,5–2 km, com no mínimo 3 amostras (ideal 5 a 10) e registro do tempo de anúncio.
3. Análise comparativa: média do R$/m² das amostras (área privativa) aplicada ao imóvel: valor de mercado (média), competitivo e otimista.
4. Estatística: média, mediana, desvio padrão e coeficiente de variação, com identificação de amostras discrepantes.
5. Fatores externos e parecer: fatores econômicos, urbanísticos e documentais que impactam o valor, consolidados numa recomendação de preço.`

export const PORTALS = ['DF Imóveis', 'WImóveis', 'OLX', 'VivaReal', 'ZAP', 'Imovelweb', 'Chaves na Mão', 'RE/MAX', 'Outro'] as const

export function portalFromUrl(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('dfimoveis')) return 'DF Imóveis'
  if (u.includes('wimoveis')) return 'WImóveis'
  if (u.includes('olx.com')) return 'OLX'
  if (u.includes('vivareal')) return 'VivaReal'
  if (u.includes('zapimoveis')) return 'ZAP'
  if (u.includes('imovelweb')) return 'Imovelweb'
  if (u.includes('chavesnamao')) return 'Chaves na Mão'
  if (u.includes('remax')) return 'RE/MAX'
  return 'Outro'
}

export const fmtBRL = (v: number | null | undefined, digits = 2) =>
  v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)
