'use client'

/**
 * v1.3 — "Quanto custa por mês": simulador de financiamento (sistema Price) na página do imóvel.
 * Entrada (%), prazo (meses, até 420), taxa anual editável (padrão 11,5%).
 * Soma condomínio e IPTU mensal quando o imóvel tem esses valores.
 */
import { useId, useMemo, useState } from 'react'
import { Calculator, Info } from 'lucide-react'
import { DEFAULT_ANNUAL_RATE, MAX_MONTHS, planTotals } from '@/lib/finance'
import { formatCurrency } from '@/lib/formatters'

interface Props {
  price: number
  condominiumFee?: number | null
  condominiumFeePeriod?: string | null
  iptu?: number | null
  iptuPeriod?: string | null
  transactionType?: string
}

/** Converte valor + período (MENSAL/ANUAL…) em valor mensal. */
export function monthlyFrom(value: number | null | undefined, period: string | null | undefined): number {
  const v = Number(value ?? 0)
  if (!Number.isFinite(v) || v <= 0) return 0
  const p = String(period ?? '').toUpperCase()
  if (/ANUAL|YEAR|ANO/.test(p)) return v / 12
  if (/TRIMES/.test(p)) return v / 3
  if (/SEMES/.test(p)) return v / 6
  return v
}

export function FinanceSimulator({ price, condominiumFee, condominiumFeePeriod, iptu, iptuPeriod, transactionType }: Props) {
  const id = useId()
  const [downPct, setDownPct] = useState(20)
  const [months, setMonths] = useState(360)
  const [rate, setRate] = useState(DEFAULT_ANNUAL_RATE)

  const condo = monthlyFrom(condominiumFee, condominiumFeePeriod)
  const iptuMonthly = monthlyFrom(iptu, iptuPeriod)

  const calc = useMemo(() => {
    const entry = price * (Math.min(95, Math.max(0, downPct)) / 100)
    const principal = Math.max(0, price - entry)
    const m = Math.min(MAX_MONTHS, Math.max(1, Math.floor(months) || 1))
    const t = planTotals(principal, rate, m)
    return { entry, principal, months: m, ...t }
  }, [price, downPct, months, rate])

  if (!price || price <= 0) return null

  // Locação: só condomínio + IPTU + aluguel (sem financiamento)
  if (transactionType === 'RENT') {
    const total = price + condo + iptuMonthly
    return (
      <section className="bg-white rounded-2xl p-6 shadow-sm" aria-labelledby={`${id}-t`}>
        <h2 id={`${id}-t`} className="font-semibold text-[#1e3a8a] mb-4 flex items-center gap-2"><Calculator className="w-4 h-4" /> Quanto custa por mês</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Aluguel" value={formatCurrency(price)} />
          {condo > 0 && <Row label="Condomínio" value={formatCurrency(Math.round(condo))} />}
          {iptuMonthly > 0 && <Row label="IPTU (mensal)" value={formatCurrency(Math.round(iptuMonthly))} />}
          <Row label="Total estimado" value={formatCurrency(Math.round(total))} strong />
        </dl>
      </section>
    )
  }

  const totalMonthly = calc.installment + condo + iptuMonthly

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="font-semibold text-[#1e3a8a] mb-1 flex items-center gap-2"><Calculator className="w-4 h-4" /> Quanto custa por mês</h2>
      <p className="text-xs text-gray-500 mb-5">Simule a parcela do financiamento e some os custos fixos do imóvel.</p>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-6">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <label htmlFor={`${id}-entry`} className="text-gray-600">Entrada</label>
              <span className="font-semibold text-[#1e3a8a]">{downPct}% · {formatCurrency(Math.round(calc.entry))}</span>
            </div>
            <input id={`${id}-entry`} type="range" min={0} max={90} step={5} value={downPct} onChange={e => setDownPct(Number(e.target.value))} className="w-full accent-[#1e3a8a]" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <label htmlFor={`${id}-months`} className="text-gray-600">Prazo</label>
              <span className="font-semibold text-[#1e3a8a]">{calc.months} meses ({Math.round(calc.months / 12)} anos)</span>
            </div>
            <input id={`${id}-months`} type="range" min={12} max={MAX_MONTHS} step={12} value={months} onChange={e => setMonths(Number(e.target.value))} className="w-full accent-[#1e3a8a]" />
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor={`${id}-rate`} className="text-sm text-gray-600 whitespace-nowrap">Taxa (% ao ano)</label>
            <input
              id={`${id}-rate`}
              type="number"
              inputMode="decimal"
              min={0}
              max={40}
              step={0.1}
              value={rate}
              onChange={e => setRate(Math.max(0, Math.min(40, Number(e.target.value) || 0)))}
              className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-[#eff6ff] p-4">
          <p className="text-xs uppercase tracking-wide text-[#2563eb] font-semibold">Parcela estimada</p>
          <p className="font-display text-2xl font-bold text-[#1e3a8a] mt-1">{formatCurrency(Math.round(calc.installment))}<span className="text-sm font-normal text-gray-500">/mês</span></p>
          <dl className="mt-3 space-y-1 text-sm border-t border-[#bfdbfe] pt-3">
            {condo > 0 && <Row label="Condomínio" value={formatCurrency(Math.round(condo))} />}
            {iptuMonthly > 0 && <Row label="IPTU (mensal)" value={formatCurrency(Math.round(iptuMonthly))} />}
            {(condo > 0 || iptuMonthly > 0) && <Row label="Total mensal" value={formatCurrency(Math.round(totalMonthly))} strong />}
            <Row label="Financiado" value={formatCurrency(Math.round(calc.principal))} />
            <Row label="Juros no período" value={formatCurrency(Math.round(calc.interest))} />
          </dl>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-1.5 text-xs text-gray-500">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        Simulação — sujeita à análise de crédito. Sistema Price, sem seguros e taxas administrativas. Valores aproximados.
      </p>
    </section>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={strong ? 'font-semibold text-[#1e3a8a]' : 'text-gray-600'}>{label}</dt>
      <dd className={strong ? 'font-bold text-[#1e3a8a]' : 'font-medium text-gray-800'}>{value}</dd>
    </div>
  )
}
