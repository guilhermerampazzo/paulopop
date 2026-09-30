/**
 * v1.4 — Área de Inteligência: endereços por quadra e ordem de busca das amostras.
 * Funções puras (sem banco), usadas pelo conector do Claude, pelo painel e pelos testes.
 *
 * Ordem de busca pedida pelo Paulo (30/09/2026):
 *   1. o próprio site (anúncios ativos, vendidos e amostras de estudos anteriores);
 *   2. mesmo condomínio/prédio nos portais prioritários;
 *   3. a quadra do imóvel avaliando;
 *   4. as quadras de mesma numeração (QR/QN/QS 303 — os anúncios trocam as siglas);
 *   5. as vizinhas, uma por vez, da mais próxima para a mais distante;
 *   6. sem base de quadras: bairro e depois cidade;
 *   7. os outros portais repetem 2 a 6 só quando os prioritários não bastarem.
 * A busca para quando o estudo atinge o número de amostras pedido; amostra recusada reabre a busca
 * do ponto em que ela parou.
 */

export interface QuadraRow {
  quadra: string
  prefix?: string | null
  number?: number | null
  city: string
  sector?: string | null
  series?: number | null
  searchTerms?: string[]
  mapX?: number | null
  mapY?: number | null
  latitude?: number | null
  longitude?: number | null
}

const PREFIX_RANK: Record<string, number> = { QR: 0, QN: 1, QS: 2, Q: 3, QI: 4 }

/** Encontra "QR 303", "QN-303", "Qd. 303", "quadra 303" num texto livre. */
export function parseQuadraRefs(text: string | null | undefined): Array<{ prefix: string | null; number: number }> {
  const out: Array<{ prefix: string | null; number: number }> = []
  const t = String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  const re = /\b(QR|QN|QS|QI|QD|QUADRA|Q)\s*[.\-:]?\s*(\d{3,4})\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    const p = m[1] === 'QD' || m[1] === 'QUADRA' ? null : m[1]
    const n = Number(m[2])
    if (!out.some(o => o.prefix === p && o.number === n)) out.push({ prefix: p, number: n })
  }
  return out
}

/** Quadra da base que corresponde ao endereço (sigla + número; só número → QR, depois QN, QS…). */
export function matchQuadra<T extends QuadraRow>(text: string | null | undefined, quadras: T[]): T | null {
  for (const ref of parseQuadraRefs(text)) {
    const sameNumber = quadras.filter(q => q.number === ref.number)
    if (!sameNumber.length) continue
    if (ref.prefix) {
      const exact = sameNumber.find(q => (q.prefix ?? '').toUpperCase() === ref.prefix)
      if (exact) return exact
      // "Q 303" num anúncio de uma quadra que na base é QR/QN/QS: cai na regra do número
      if (ref.prefix !== 'Q') continue
    }
    return [...sameNumber].sort((a, b) => (PREFIX_RANK[(a.prefix ?? '').toUpperCase()] ?? 9) - (PREFIX_RANK[(b.prefix ?? '').toUpperCase()] ?? 9))[0]
  }
  return null
}

/** Quadras de mesma numeração (as "irmãs"): QR 303 ↔ QN 303 ↔ QS 303. */
export function sisterQuadras<T extends QuadraRow>(base: T, quadras: T[]): T[] {
  if (base.number == null) return []
  return quadras
    .filter(q => q.quadra !== base.quadra && q.number === base.number && q.city === base.city)
    .sort((a, b) => (PREFIX_RANK[(a.prefix ?? '').toUpperCase()] ?? 9) - (PREFIX_RANK[(b.prefix ?? '').toUpperCase()] ?? 9))
}

function dist(a: QuadraRow, b: QuadraRow): number | null {
  if (a.mapX != null && a.mapY != null && b.mapX != null && b.mapY != null) return Math.hypot(a.mapX - b.mapX, a.mapY - b.mapY)
  if (a.latitude != null && a.longitude != null && b.latitude != null && b.longitude != null) {
    const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180
    const dLat = toRad(b.latitude - a.latitude), dLon = toRad(b.longitude - a.longitude)
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(h))
  }
  return null
}

/** Vizinhas da mais próxima para a mais distante (distância aproximada em metros). Sem posição → fora da lista. */
export function neighborQuadras<T extends QuadraRow>(base: T, quadras: T[], limit = 40): Array<{ quadra: T; distM: number }> {
  return quadras
    .filter(q => q.quadra !== base.quadra && q.city === base.city)
    .map(q => ({ quadra: q, distM: dist(base, q) }))
    .filter((x): x is { quadra: T; distM: number } => x.distM != null)
    .sort((a, b) => a.distM - b.distM)
    .slice(0, limit)
    .map(x => ({ quadra: x.quadra, distM: Math.round(x.distM) }))
}

export function defaultSearchTerms(q: { quadra: string; prefix?: string | null; number?: number | null }): string[] {
  if (q.number == null) return [q.quadra]
  const p = (q.prefix ?? '').toUpperCase()
  if (!p || p === 'Q') return [`Quadra ${q.number}`, `Q ${q.number}`, `QD ${q.number}`]
  return [`${p} ${q.number}`, `${p}${q.number}`, `Quadra ${q.number}`]
}

// ─── Ordem de busca ───────────────────────────────────────────────────────────

export type StepKind = 'SITE' | 'CONDO' | 'QUADRA' | 'IRMA' | 'VIZINHA' | 'BAIRRO' | 'CIDADE'

export interface PlanStep {
  kind: StepKind
  /** passo da lista do Paulo (1 = site, 2 = condomínio, 3 = quadra, 4 = mesma numeração, 5 = vizinhas, 6 = bairro/cidade) */
  passo: number
  label: string
  quadra: string | null
  distM: number | null
  terms: string[]
}

export const STEP_LABEL: Record<StepKind, string> = {
  SITE: 'Site corretorpaulopop.com', CONDO: 'Mesmo condomínio', QUADRA: 'Mesma quadra', IRMA: 'Mesma numeração',
  VIZINHA: 'Quadra vizinha', BAIRRO: 'Bairro', CIDADE: 'Cidade',
}

export function buildSearchPlan(input: {
  city: string | null
  neighborhood?: string | null
  condo?: string | null
  /** quadra do imóvel avaliando já identificada (ou null) */
  base: QuadraRow | null
  quadras: QuadraRow[]
  maxNeighbors?: number
}): PlanStep[] {
  const plan: PlanStep[] = []
  const cityLabel = (input.city ?? '').replace(/\s*-\s*DF$/i, '').trim()
  plan.push({ kind: 'SITE', passo: 1, label: 'Site corretorpaulopop.com: anúncios ativos, vendidos e amostras de estudos anteriores', quadra: input.base?.quadra ?? null, distM: null, terms: [] })
  const condo = (input.condo ?? '').trim()
  if (condo) plan.push({ kind: 'CONDO', passo: 2, label: `Mesmo condomínio: ${condo}`, quadra: input.base?.quadra ?? null, distM: 0, terms: [condo, cityLabel ? `${condo} ${cityLabel}` : condo] })
  if (input.base) {
    const b = input.base
    const terms = (q: QuadraRow) => (q.searchTerms?.length ? q.searchTerms : defaultSearchTerms(q))
    plan.push({ kind: 'QUADRA', passo: 3, label: `Quadra do imóvel: ${b.quadra}`, quadra: b.quadra, distM: 0, terms: terms(b) })
    const sisters = sisterQuadras(b, input.quadras)
    const near = new Map(neighborQuadras(b, input.quadras, 999).map(n => [n.quadra.quadra, n.distM]))
    for (const s of sisters) plan.push({ kind: 'IRMA', passo: 4, label: `Mesma numeração: ${s.quadra}`, quadra: s.quadra, distM: near.get(s.quadra) ?? null, terms: terms(s) })
    const skip = new Set([b.quadra, ...sisters.map(s => s.quadra)])
    for (const n of neighborQuadras(b, input.quadras, 999).filter(n => !skip.has(n.quadra.quadra)).slice(0, input.maxNeighbors ?? 40)) {
      plan.push({ kind: 'VIZINHA', passo: 5, label: `Vizinha: ${n.quadra.quadra} (cerca de ${n.distM} m)`, quadra: n.quadra.quadra, distM: n.distM, terms: terms(n.quadra) })
    }
  }
  const hood = (input.neighborhood ?? '').trim()
  if (hood) plan.push({ kind: 'BAIRRO', passo: 6, label: `Bairro: ${hood}`, quadra: null, distM: null, terms: [hood, cityLabel && !hood.toLowerCase().includes(cityLabel.toLowerCase()) ? `${hood} ${cityLabel}` : hood] })
  if (cityLabel && cityLabel.toLowerCase() !== hood.toLowerCase()) plan.push({ kind: 'CIDADE', passo: 6, label: `Cidade: ${cityLabel}`, quadra: null, distM: null, terms: [cityLabel] })
  return plan
}

export const PRIORITY_PORTALS = ['WImóveis', 'DF Imóveis', 'OLX'] as const
export const OTHER_PORTALS = ['VivaReal', 'ZAP', 'Imovelweb', 'Chaves na Mão'] as const

export interface SearchCursor {
  /** 0 = portais prioritários; 1 = demais portais */
  tier: number
  /** posição no plano */
  index: number
  done: Array<{ tier: number; kind: StepKind; quadra: string | null; at: string }>
  /** assinatura do plano (quadra-base + condomínio). Se o endereço do imóvel mudar, a busca recomeça. */
  key?: string
}

export const emptyCursor = (): SearchCursor => ({ tier: 0, index: 0, done: [] })

export function normalizeCursor(raw: unknown): SearchCursor {
  const c = raw && typeof raw === 'object' ? (raw as Partial<SearchCursor>) : {}
  return {
    tier: c.tier === 1 ? 1 : 0,
    index: Number.isInteger(c.index) && (c.index as number) >= 0 ? (c.index as number) : 0,
    done: Array.isArray(c.done) ? c.done.slice(-200) : [],
    ...(typeof c.key === 'string' ? { key: c.key.slice(0, 200) } : {}),
  }
}

export interface NextStepResult {
  done: boolean
  reason: 'META_ATINGIDA' | 'ORDEM_ESGOTADA' | null
  step: PlanStep | null
  portals: string[]
  cursor: SearchCursor
  /** amostras que ainda faltam para a meta */
  missing: number
  position: { atual: number; total: number }
}

/**
 * Próximo passo da busca. `advance` marca o passo atual como concluído antes de responder.
 * `have` = amostras aprovadas + candidatas aguardando a decisão do corretor.
 */
export function nextSearchStep(opts: {
  plan: PlanStep[]
  cursor: SearchCursor
  have: number
  target: number
  advance?: boolean
  priorityPortals?: string[]
  otherPortals?: string[]
  now?: string
}): NextStepResult {
  const plan = opts.plan
  const priority = opts.priorityPortals?.length ? opts.priorityPortals : [...PRIORITY_PORTALS]
  const others = opts.otherPortals ?? [...OTHER_PORTALS]
  let cursor: SearchCursor = { ...opts.cursor, done: [...opts.cursor.done] }
  const missing = Math.max(0, opts.target - opts.have)

  const clamp = () => {
    // fim do plano nos prioritários → recomeça no passo 2 com os demais portais
    if (cursor.index >= plan.length && cursor.tier === 0 && others.length) {
      const first = plan.findIndex(s => s.kind !== 'SITE')
      cursor = { ...cursor, tier: 1, index: first < 0 ? plan.length : first }
    }
  }
  if (opts.advance && cursor.index < plan.length) {
    const cur = plan[cursor.index]
    cursor.done.push({ tier: cursor.tier, kind: cur.kind, quadra: cur.quadra, at: opts.now ?? new Date().toISOString() })
    cursor.index += 1
  }
  clamp()
  const total = plan.length
  if (missing <= 0) return { done: true, reason: 'META_ATINGIDA', step: null, portals: [], cursor, missing: 0, position: { atual: Math.min(cursor.index + 1, total), total } }
  if (cursor.index >= plan.length) return { done: true, reason: 'ORDEM_ESGOTADA', step: null, portals: [], cursor, missing, position: { atual: total, total } }
  const step = plan[cursor.index]
  const portals = step.kind === 'SITE' ? ['Site corretorpaulopop.com'] : cursor.tier === 0 ? priority : others
  return { done: false, reason: null, step, portals, cursor, missing, position: { atual: cursor.index + 1, total } }
}
