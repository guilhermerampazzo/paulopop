import { describe, expect, it } from 'vitest'
import { appendPriceHistory, isPriceReduced, parsePriceHistory, priceReductions, PRICE_HISTORY_MAX } from '@/lib/price-history'

describe('price-history', () => {
  it('parse ignora entradas inválidas e ordena por data', () => {
    const h = parsePriceHistory([{ date: '2026-02-01T00:00:00Z', price: 200 }, { date: 'x', price: 1 }, { date: '2026-01-01T00:00:00Z', price: '300' }, null])
    expect(h.map(p => p.price)).toEqual([300, 200])
  })

  it('append registra só quando o preço muda e limita a 30', () => {
    expect(appendPriceHistory(null, 500_000)?.length).toBe(1)
    const h = [{ date: '2026-01-01T00:00:00Z', price: 500_000 }]
    expect(appendPriceHistory(h, 500_000)).toBeNull()
    expect(appendPriceHistory(h, 480_000)?.map(p => p.price)).toEqual([500_000, 480_000])
    expect(appendPriceHistory(h, null)).toBeNull()
    const big = Array.from({ length: 40 }, (_, i) => ({ date: new Date(2026, 0, i + 1).toISOString(), price: 1000 + i }))
    expect(appendPriceHistory(big, 1)?.length).toBe(PRICE_HISTORY_MAX)
  })

  it('detecta redução e lista as quedas da mais recente para a mais antiga', () => {
    const h = [
      { date: '2026-01-01T00:00:00Z', price: 500_000 },
      { date: '2026-02-01T00:00:00Z', price: 520_000 },
      { date: '2026-03-01T00:00:00Z', price: 480_000 },
      { date: '2026-04-01T00:00:00Z', price: 470_000 },
    ]
    expect(isPriceReduced(h)).toBe(true)
    expect(isPriceReduced(h.slice(0, 2))).toBe(false)
    expect(isPriceReduced([])).toBe(false)
    const r = priceReductions(h)
    expect(r.map(x => x.diff)).toEqual([10_000, 40_000])
    expect(r[1].pct).toBeCloseTo(7.69, 1)
  })
})
