/**
 * v1.4 — número vindo de anúncio, do conector ou de formulário: aceita número ou texto curto no formato
 * brasileiro. "450.000" e "1.250,50" (ponto de milhar) · "52,5" e "52.5" (decimal) · "R$ 250.000" · "52 m²".
 */
export function parseNumberBR(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string' || !v.trim() || v.length > 30) return null
  const t = v.replace(/[R$\s]|m²|m2/gi, '')
  const n = Number(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
