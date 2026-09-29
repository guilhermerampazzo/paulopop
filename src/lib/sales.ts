/**
 * v1.1 — venda ou locação concluída: desconto, tempo de mercado e formatação em dias/meses/anos.
 */

export const SALE_SOURCES = [
  { value: 'site', label: 'Site' },
  { value: 'portal', label: 'Portal (ZAP, OLX, DF Imóveis…)' },
  { value: 'remax', label: 'Rede RE/MAX' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'placa', label: 'Placa / rua' },
  { value: 'redes', label: 'Redes sociais' },
  { value: 'outro', label: 'Outro' },
] as const

/** Dias inteiros entre a data de publicação (ou cadastro) e a data da venda. */
export function daysOnMarket(listedAt: Date | string | null | undefined, soldAt: Date | string | null | undefined): number | null {
  if (!listedAt || !soldAt) return null
  const a = new Date(listedAt).getTime()
  const b = new Date(soldAt).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

/** Desconto entre o valor anunciado e o valor final: { pct, value } (positivos = desconto). */
export function discount(listPrice: number | null | undefined, salePrice: number | null | undefined): { pct: number; value: number } | null {
  if (!listPrice || salePrice === null || salePrice === undefined) return null
  const value = Math.round((listPrice - salePrice) * 100) / 100
  const pct = Math.round((value / listPrice) * 10000) / 100
  return { pct, value }
}

/**
 * "23 dias", "2 meses e 5 dias", "1 ano, 2 meses e 5 dias".
 * Abaixo de 30 dias mostra só dias; a partir de 30, meses (30 dias) e anos (12 meses).
 */
export function formatDuration(days: number | null | undefined): string {
  if (days === null || days === undefined || Number.isNaN(days)) return ''
  if (days < 30) return `${days} ${days === 1 ? 'dia' : 'dias'}`
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  const rest = days - years * 365 - months * 30
  const parts: string[] = []
  if (years) parts.push(`${years} ${years === 1 ? 'ano' : 'anos'}`)
  if (months) parts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`)
  if (rest) parts.push(`${rest} ${rest === 1 ? 'dia' : 'dias'}`)
  if (parts.length <= 1) return parts[0] ?? '0 dias'
  const last = parts.pop()
  return `${parts.join(', ')} e ${last}`
}

export function saleVerb(status: string | null | undefined): string {
  return status === 'RENTED' ? 'Alugado' : 'Vendido'
}
