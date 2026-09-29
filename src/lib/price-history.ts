/**
 * v1.3 — histórico de preço do imóvel (`Property.priceHistory`: [{ date, price }]).
 * Usado na rota PUT (registrar mudança), no card (selo "Preço reduzido") e na página do imóvel.
 */

export interface PricePoint { date: string; price: number }

export const PRICE_HISTORY_MAX = 30

/** Converte o Json do Prisma numa lista validada e ordenada por data. */
export function parsePriceHistory(raw: unknown): PricePoint[] {
  if (!Array.isArray(raw)) return []
  const list: PricePoint[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const price = Number(o.price)
    const date = typeof o.date === 'string' ? o.date : ''
    if (!Number.isFinite(price) || price <= 0 || !date || Number.isNaN(Date.parse(date))) continue
    list.push({ date, price })
  }
  return list.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
}

/**
 * Acrescenta um ponto quando o preço mudou (ou quando o histórico está vazio), mantendo até 30 entradas.
 * Devolve a lista nova ou null se nada mudou.
 */
export function appendPriceHistory(raw: unknown, newPrice: number | null | undefined, now = new Date()): PricePoint[] | null {
  const price = Number(newPrice)
  if (!Number.isFinite(price) || price <= 0) return null
  const history = parsePriceHistory(raw)
  const last = history[history.length - 1]
  if (last && Math.abs(last.price - price) < 0.005) return null
  const next = [...history, { date: now.toISOString(), price }]
  return next.slice(-PRICE_HISTORY_MAX)
}

/** Última entrada menor que a anterior → preço reduzido. */
export function isPriceReduced(raw: unknown): boolean {
  const h = parsePriceHistory(raw)
  if (h.length < 2) return false
  return h[h.length - 1].price < h[h.length - 2].price
}

/** Reduções de preço (cada par consecutivo em que o preço caiu), da mais recente para a mais antiga. */
export function priceReductions(raw: unknown): Array<{ date: string; from: number; to: number; diff: number; pct: number }> {
  const h = parsePriceHistory(raw)
  const out: Array<{ date: string; from: number; to: number; diff: number; pct: number }> = []
  for (let i = 1; i < h.length; i++) {
    if (h[i].price < h[i - 1].price) {
      const diff = h[i - 1].price - h[i].price
      out.push({ date: h[i].date, from: h[i - 1].price, to: h[i].price, diff, pct: (diff / h[i - 1].price) * 100 })
    }
  }
  return out.reverse()
}
