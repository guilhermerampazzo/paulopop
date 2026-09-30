/**
 * v1.4 — preço por m² calculado na tela do painel (mesma conta do servidor):
 * valor ÷ área útil (privativa); sem área útil, área total. Aceita texto com vírgula.
 */
export function pricePerSqmClient(price: unknown, usefulArea: unknown, totalArea: unknown): number | null {
  const n = (v: unknown) => {
    if (v === null || v === undefined || v === '') return 0
    const x = Number(String(v).replace(',', '.'))
    return Number.isFinite(x) ? x : 0
  }
  const p = n(price)
  const area = n(usefulArea) > 0 ? n(usefulArea) : n(totalArea)
  if (!(area > 10) || !(p > 1000)) return null
  return p / area
}
