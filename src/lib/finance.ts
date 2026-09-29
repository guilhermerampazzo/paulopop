/**
 * v1.3 — matemática do simulador "Quanto custa por mês" (sistema Price / tabela Price).
 * Sem dependências; usada pelo componente FinanceSimulator e pelos testes unitários.
 */

/** Taxa anual padrão do simulador (% a.a.). Editável na interface. */
export const DEFAULT_ANNUAL_RATE = 11.5
/** Prazo máximo aceito (meses) — 35 anos. */
export const MAX_MONTHS = 420

/** Converte taxa anual (em %) para taxa mensal equivalente (fração), com capitalização composta. */
export function monthlyRate(annualRatePct: number): number {
  const a = Math.max(0, Number(annualRatePct) || 0) / 100
  return Math.pow(1 + a, 1 / 12) - 1
}

/**
 * Parcela fixa (sistema Price) para um principal, taxa anual (%) e prazo em meses.
 * Taxa zero → divisão simples. Valores inválidos → 0.
 */
export function priceInstallment(principal: number, annualRatePct: number, months: number): number {
  const p = Number(principal)
  const n = Math.floor(Number(months))
  if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(n) || n <= 0) return 0
  const i = monthlyRate(annualRatePct)
  if (i <= 0) return p / n
  const factor = Math.pow(1 + i, n)
  return (p * i * factor) / (factor - 1)
}

/** Estimativa rápida usada na barra de resumo: 20% de entrada, 360 meses, taxa padrão. */
export function estimateMonthly(price: number | null | undefined, downPct = 20, months = 360, annualRatePct = DEFAULT_ANNUAL_RATE): number | null {
  if (!price || price <= 0) return null
  const principal = price * (1 - Math.min(95, Math.max(0, downPct)) / 100)
  const v = priceInstallment(principal, annualRatePct, Math.min(MAX_MONTHS, Math.max(1, months)))
  return v > 0 ? v : null
}

/** Total pago e juros totais para um plano. */
export function planTotals(principal: number, annualRatePct: number, months: number): { installment: number; total: number; interest: number } {
  const installment = priceInstallment(principal, annualRatePct, months)
  const total = installment * Math.max(0, Math.floor(months))
  return { installment, total, interest: Math.max(0, total - principal) }
}
