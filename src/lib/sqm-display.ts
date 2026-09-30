/**
 * v1.4 — O que o público vê no bloco "Preço por m² comparado".
 *
 * Regra (decidida pelo Paulo em 30/09/2026, faixa de tolerância):
 *  - abaixo da referência (2% ou mais): mostra normalmente, com a referência e o percentual;
 *  - de 2% abaixo até SQM_TOLERANCE_PCT acima: mostra "Imóvel no preço de mercado", sem números;
 *  - acima da tolerância: o bloco não aparece para o público (nada é afirmado).
 *
 * A referência é a média automática dos anúncios do site (modo AUTO) ou o valor informado
 * pelo corretor na ficha do imóvel (modo MANUAL). No modo HIDDEN o bloco nunca aparece.
 * A função é pura: serve ao site, à ficha impressa, ao painel e aos testes.
 */
export const SQM_TOLERANCE_PCT = 10

export type SqmMode = 'AUTO' | 'MANUAL' | 'HIDDEN'
export type SqmVerdict = 'below' | 'market' | 'hidden'

export interface SqmReference {
  avg: number
  /** "Samambaia Sul (8 anúncios)" ou o rótulo do corretor */
  label: string
  /** quantidade de anúncios na média automática; null na referência manual */
  count: number | null
  kind: 'region' | 'building' | 'manual'
}

export interface SqmPublicItem {
  ref: SqmReference
  pct: number
  verdict: SqmVerdict
  /** frase pronta para o público (vazia quando oculto) */
  text: string
}

export function sqmVerdict(own: number, avg: number, tolerancePct = SQM_TOLERANCE_PCT): { pct: number; verdict: SqmVerdict; text: string } {
  if (!(own > 0) || !(avg > 0)) return { pct: 0, verdict: 'hidden', text: '' }
  const exact = ((own - avg) / avg) * 100
  const pct = Math.round(exact)
  if (exact <= -2) return { pct, verdict: 'below', text: `${Math.abs(pct)}% abaixo da referência` }
  if (exact <= tolerancePct) return { pct, verdict: 'market', text: 'Imóvel no preço de mercado' }
  return { pct, verdict: 'hidden', text: '' }
}

export function normalizeSqmMode(mode: string | null | undefined): SqmMode {
  return mode === 'MANUAL' || mode === 'HIDDEN' ? mode : 'AUTO'
}

/**
 * Monta a lista de comparações visíveis ao público.
 * `auto` vem de compareSqm (média da região e do prédio); `manual` vem da ficha do imóvel.
 */
export function sqmPublicView(input: {
  own: number | null
  mode?: string | null
  auto?: { region: { avg: number; count: number; label: string } | null; building: { avg: number; count: number; label?: string } | null } | null
  manual?: { value: number | null; label?: string | null } | null
  tolerancePct?: number
}): { own: number | null; items: SqmPublicItem[]; headline: SqmVerdict } {
  const own = input.own && input.own > 0 ? input.own : null
  const mode = normalizeSqmMode(input.mode)
  if (!own || mode === 'HIDDEN') return { own, items: [], headline: 'hidden' }

  const refs: SqmReference[] = []
  if (mode === 'MANUAL' && input.manual?.value && input.manual.value > 0) {
    refs.push({ avg: input.manual.value, label: (input.manual.label ?? '').trim() || 'Referência do corretor', count: null, kind: 'manual' })
  } else if (mode === 'AUTO' && input.auto) {
    if (input.auto.region) refs.push({ avg: input.auto.region.avg, label: input.auto.region.label, count: input.auto.region.count, kind: 'region' })
    if (input.auto.building) refs.push({ avg: input.auto.building.avg, label: input.auto.building.label ?? 'o prédio', count: input.auto.building.count, kind: 'building' })
  }
  const all = refs.map(ref => ({ ref, ...sqmVerdict(own, ref.avg, input.tolerancePct) }))
  const items = all.filter(i => i.verdict !== 'hidden')
  const headline: SqmVerdict = items.some(i => i.verdict === 'below') ? 'below' : items.length ? 'market' : 'hidden'
  return { own, items, headline }
}
