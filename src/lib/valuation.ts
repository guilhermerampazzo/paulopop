/**
 * v1.3 — Avaliação online ("Vender meu imóvel"): faixa de preço a partir dos anúncios e vendas do próprio site.
 * Regra: R$/m² médio das amostras do escopo mais próximo (prédio → bairro → cidade), mínimo 2 anúncios;
 * ajuste pelo estado de conservação; faixa = −7 % / +7 % em torno do valor central.
 */
export type Condition = 'ORIGINAL' | 'PARCIAL' | 'TOTAL'
export type Scope = 'predio' | 'bairro' | 'cidade' | 'insuficiente'

export interface SampleRow { price: number; area: number; scope: Exclude<Scope, 'insuficiente'> }

export interface ValuationInput { area: number; condition: Condition; samples: SampleRow[] }
export interface ValuationResult { low: number | null; mid: number | null; high: number | null; sqm: number | null; basis: { count: number; scope: Scope } }

export const CONDITION_ADJUST: Record<Condition, number> = { ORIGINAL: -0.05, PARCIAL: 0, TOTAL: 0.05 }
const MIN_SAMPLES = 2
const round = (v: number) => Math.round(v / 1000) * 1000

export function pickScope(samples: SampleRow[]): { scope: Scope; rows: SampleRow[] } {
  for (const scope of ['predio', 'bairro', 'cidade'] as const) {
    const rows = samples.filter(s => s.scope === scope && s.price > 0 && s.area > 0)
    if (rows.length >= MIN_SAMPLES) return { scope, rows }
  }
  return { scope: 'insuficiente', rows: [] }
}

export function estimateRange(input: ValuationInput): ValuationResult {
  const { scope, rows } = pickScope(input.samples)
  if (scope === 'insuficiente' || !input.area || input.area <= 0) return { low: null, mid: null, high: null, sqm: null, basis: { count: rows.length, scope: 'insuficiente' } }
  const sqms = rows.map(r => r.price / r.area).sort((a, b) => a - b)
  // média aparada: descarta o menor e o maior quando há 5+ amostras
  const used = sqms.length >= 5 ? sqms.slice(1, -1) : sqms
  const sqm = used.reduce((a, b) => a + b, 0) / used.length
  const mid = sqm * input.area * (1 + CONDITION_ADJUST[input.condition])
  return { low: round(mid * 0.93), mid: round(mid), high: round(mid * 1.07), sqm: Math.round(sqm), basis: { count: rows.length, scope } }
}

export const SCOPE_LABEL: Record<Scope, string> = { predio: 'no mesmo prédio', bairro: 'no mesmo bairro', cidade: 'na mesma cidade', insuficiente: '' }
