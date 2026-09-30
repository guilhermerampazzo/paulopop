'use client'

/**
 * v1.4 — Hub "Preço por m² comparado", editável em cada imóvel.
 * Mostra ao corretor o R$/m² calculado (preço ÷ área útil), as médias automáticas do site e a prévia
 * do que o público vê. O corretor pode trocar a referência automática por um valor dele
 * (para cima ou para baixo), com rótulo público e nota interna, ou ocultar o bloco.
 */
import { useEffect, useMemo, useState } from 'react'
import { BarChart3, RefreshCw, Eye, EyeOff, Info } from 'lucide-react'
import { sqmPublicView, sqmVerdict, SQM_TOLERANCE_PCT } from '@/lib/sqm-display'
import { pricePerSqmClient } from '@/lib/sqm-client'

interface Auto { own: number | null; region: { avg: number; count: number; label: string } | null; building: { avg: number; count: number; label: string } | null; tolerancePct: number }

const brl = (v: number | null | undefined) => (v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v))

export function SqmHubPanel({ propertyId, data, onChange }: { propertyId: string; data: Record<string, unknown>; onChange: (field: string, value: unknown) => void }) {
  const [auto, setAuto] = useState<Auto | null>(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`/api/admin/imoveis/${propertyId}/sqm`).then(r => (r.ok ? r.json() : null)).then(d => setAuto(d)).catch(() => setAuto(null)).finally(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [propertyId])

  const own = pricePerSqmClient(data.price, data.usefulArea, data.totalArea)
  const mode = data.sqmCompareMode === 'MANUAL' || data.sqmCompareMode === 'HIDDEN' ? (data.sqmCompareMode as string) : 'AUTO'
  const refValue = data.sqmRefValue === null || data.sqmRefValue === undefined || data.sqmRefValue === '' ? null : Number(String(data.sqmRefValue).replace(',', '.'))
  const hidePrice = data.hidePrice === true

  const view = useMemo(() => sqmPublicView({
    own, mode,
    auto: auto ? { region: auto.region, building: auto.building } : null,
    manual: { value: refValue, label: (data.sqmRefLabel as string) ?? '' },
  }), [own, mode, auto, refValue, data.sqmRefLabel])

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]'
  const autoRows = [auto?.region ? { name: `Média de ${auto.region.label}`, ...auto.region } : null, auto?.building ? { name: `Média do ${auto.building.label}`, ...auto.building } : null].filter((r): r is { name: string; avg: number; count: number; label: string } => !!r)
  const step = (pct: number) => {
    const base = refValue ?? auto?.region?.avg ?? auto?.building?.avg ?? own
    if (!base) return
    onChange('sqmRefValue', String(Math.round(base * (1 + pct / 100))))
    if (mode !== 'MANUAL') onChange('sqmCompareMode', 'MANUAL')
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4" data-testid="sqm-hub">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1e3a8a]"><BarChart3 className="h-4 w-4" /> Preço por m² comparado (o que aparece no anúncio)</h3>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"><RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar médias</button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg bg-[#F0F4F8] p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Este imóvel</p>
          <p className="text-lg font-bold text-[#1e3a8a]">{own ? `${brl(own)}/m²` : '—'}</p>
          <p className="text-[11px] text-gray-500">calculado: valor ÷ área {Number(data.usefulArea) > 0 ? 'útil' : 'total'}</p>
        </div>
        {autoRows.map(r => {
          const v = own ? sqmVerdict(own, r.avg) : null
          return (
            <div key={r.name} className="rounded-lg bg-[#F0F4F8] p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">{r.name} ({r.count})</p>
              <p className="text-lg font-bold text-[#1e3a8a]">{brl(r.avg)}/m²</p>
              {v && <p className={`text-[11px] font-semibold ${v.pct < 0 ? 'text-emerald-700' : v.pct > SQM_TOLERANCE_PCT ? 'text-orange-700' : 'text-gray-600'}`}>este imóvel: {v.pct > 0 ? '+' : ''}{v.pct}% (só você vê este número)</p>}
            </div>
          )
        })}
        {!autoRows.length && <div className="rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-500 md:col-span-2">Ainda não há anúncios suficientes no site (mínimo de 2 na região) para calcular a média automática. Use uma referência sua, se quiser.</div>}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label htmlFor="sqmCompareMode" className="mb-1 block text-xs font-medium text-gray-600">Referência usada</label>
          <select id="sqmCompareMode" value={mode} onChange={e => onChange('sqmCompareMode', e.target.value)} className={inputCls}>
            <option value="AUTO">Automática (média do site)</option>
            <option value="MANUAL">Minha referência</option>
            <option value="HIDDEN">Não mostrar comparação</option>
          </select>
        </div>
        <div>
          <label htmlFor="sqmRefValue" className="mb-1 block text-xs font-medium text-gray-600">Minha referência (R$/m²)</label>
          <div className="flex gap-1">
            <button type="button" onClick={() => step(-1)} aria-label="Diminuir a referência em 1%" className="rounded-lg border border-gray-300 px-2 text-sm hover:bg-gray-50">−</button>
            <input id="sqmRefValue" type="number" min={0} step="1" value={(data.sqmRefValue as string | number | null) ?? ''} onChange={e => onChange('sqmRefValue', e.target.value)} disabled={mode !== 'MANUAL'} className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400`} placeholder={auto?.region ? String(Math.round(auto.region.avg)) : '0'} />
            <button type="button" onClick={() => step(1)} aria-label="Aumentar a referência em 1%" className="rounded-lg border border-gray-300 px-2 text-sm hover:bg-gray-50">+</button>
          </div>
        </div>
        <div>
          <label htmlFor="sqmRefLabel" className="mb-1 block text-xs font-medium text-gray-600">Rótulo público da referência</label>
          <input id="sqmRefLabel" value={(data.sqmRefLabel as string) ?? ''} onChange={e => onChange('sqmRefLabel', e.target.value)} disabled={mode !== 'MANUAL'} maxLength={80} className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400`} placeholder="Estudo de mercado de set/2026" />
        </div>
        <div>
          <label htmlFor="sqmRefNote" className="mb-1 block text-xs font-medium text-gray-600">Nota interna (de onde veio)</label>
          <input id="sqmRefNote" value={(data.sqmRefNote as string) ?? ''} onChange={e => onChange('sqmRefNote', e.target.value)} maxLength={500} className={inputCls} placeholder="10 amostras no DF Imóveis, QR 303" />
        </div>
      </div>

      <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${view.headline === 'hidden' || hidePrice ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-900'}`} data-testid="sqm-preview">
        {view.headline === 'hidden' || hidePrice ? <EyeOff className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <Eye className="mt-0.5 h-4 w-4 flex-shrink-0" />}
        <p>
          <strong>O público vê: </strong>
          {hidePrice ? 'nada (o preço do imóvel está oculto).'
            : !own ? 'nada (informe o valor e a área do imóvel).'
            : view.headline === 'below' ? view.items.filter(i => i.verdict === 'below').map(i => `“Este imóvel está ${i.text}” — ${i.ref.kind === 'manual' ? i.ref.label : `média de ${i.ref.label}`}: ${brl(i.ref.avg)}/m²`).join(' · ')
            : view.headline === 'market' ? '“Imóvel no preço de mercado”, sem números.'
            : mode === 'HIDDEN' ? 'nada (comparação desligada neste imóvel). O R$/m² do imóvel continua no cabeçalho do anúncio.'
            : mode === 'MANUAL' && !refValue ? 'nada (informe a sua referência de R$/m²).'
            : 'nada. O imóvel está mais de ' + SQM_TOLERANCE_PCT + '% acima da referência, então a comparação não é exibida. O R$/m² do imóvel continua no cabeçalho do anúncio.'}
        </p>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-gray-500"><Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> Regra: abaixo da referência mostra o percentual; até {SQM_TOLERANCE_PCT}% acima mostra “Imóvel no preço de mercado”; acima disso a comparação some do anúncio. Com “Minha referência”, o anúncio informa que a referência é do corretor. As mudanças valem depois de salvar.</p>
    </div>
  )
}
