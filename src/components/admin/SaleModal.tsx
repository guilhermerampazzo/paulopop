'use client'

/**
 * v1.1 — Modal "Marcar como vendido/alugado": data, valor final, desconto (calculado na hora),
 * origem do comprador e observação. O tempo de mercado é calculado pelo servidor.
 */
import { useMemo, useState } from 'react'
import { BadgeCheck, Loader2, X, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SALE_SOURCES, discount, daysOnMarket, formatDuration } from '@/lib/sales'

interface SaleModalProps {
  propertyId: string
  transactionType: 'SALE' | 'RENT'
  listPrice: number | null
  listedAt?: string | Date | null
  current?: {
    status?: string
    soldAt?: string | Date | null
    salePrice?: number | string | null
    saleDiscountPct?: number | string | null
    daysOnMarket?: number | null
    saleSource?: string | null
    saleNotes?: string | null
    showSalePrice?: boolean
  }
  onClose: () => void
  onDone: (result: Record<string, unknown> | null) => void
}

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function SaleModal({ propertyId, transactionType, listPrice, listedAt, current, onClose, onDone }: SaleModalProps) {
  const isRent = transactionType === 'RENT'
  const already = current?.status === 'SOLD' || current?.status === 'RENTED'
  const [soldAt, setSoldAt] = useState(() => {
    const d = current?.soldAt ? new Date(current.soldAt) : new Date()
    return d.toISOString().slice(0, 10)
  })
  const [salePrice, setSalePrice] = useState(current?.salePrice != null ? String(Number(current.salePrice)) : listPrice != null ? String(listPrice) : '')
  const [source, setSource] = useState(current?.saleSource ?? 'site')
  const [notes, setNotes] = useState(current?.saleNotes ?? '')
  const [showSalePrice, setShowSalePrice] = useState(Boolean(current?.showSalePrice))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disc = useMemo(() => discount(listPrice, salePrice === '' ? null : Number(salePrice)), [listPrice, salePrice])
  const days = useMemo(() => daysOnMarket(listedAt, soldAt), [listedAt, soldAt])

  async function submit() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/imoveis/${propertyId}/venda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soldAt, salePrice: salePrice === '' ? null : Number(salePrice), listPrice, source, notes, showSalePrice, kind: isRent ? 'RENTED' : 'SOLD' }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'Não foi possível registrar')
      onDone(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function undo() {
    if (!confirm('Desfazer a venda/locação e voltar o imóvel para ativo?')) return
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/imoveis/${propertyId}/venda`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Não foi possível desfazer')
      onDone(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="sale-title">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 id="sale-title" className="flex items-center gap-2 text-base font-bold text-[#1e3a8a]">
            <BadgeCheck className="h-5 w-5 text-green-600" />
            {already ? `Registro de ${isRent ? 'locação' : 'venda'}` : `Marcar como ${isRent ? 'alugado' : 'vendido'}`}
          </h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sale-date" className="mb-1 block text-xs font-medium text-gray-600">Data da {isRent ? 'locação' : 'venda'}</label>
              <input id="sale-date" type="date" value={soldAt} max={new Date().toISOString().slice(0, 10)} onChange={e => setSoldAt(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="sale-price" className="mb-1 block text-xs font-medium text-gray-600">Valor final (R$)</label>
              <input id="sale-price" type="number" min="0" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} className={inputCls} placeholder={listPrice != null ? String(listPrice) : '0'} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl bg-[#F0F4F8] p-3 text-center">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Anunciado</p>
              <p className="text-sm font-semibold text-[#1e3a8a]">{listPrice != null ? fmtBRL(listPrice) : '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Desconto</p>
              <p className={`text-sm font-semibold ${disc && disc.value > 0 ? 'text-red-600' : 'text-green-700'}`}>
                {disc ? `${disc.pct.toLocaleString('pt-BR')}% · ${fmtBRL(disc.value)}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Tempo no mercado</p>
              <p className="text-sm font-semibold text-[#1e3a8a]">{days !== null ? formatDuration(days) : '—'}</p>
            </div>
          </div>

          <div>
            <label htmlFor="sale-source" className="mb-1 block text-xs font-medium text-gray-600">De onde veio o {isRent ? 'inquilino' : 'comprador'}</label>
            <select id="sale-source" value={source} onChange={e => setSource(e.target.value)} className={inputCls}>
              {SALE_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="sale-notes" className="mb-1 block text-xs font-medium text-gray-600">Observação (interna)</label>
            <textarea id="sale-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} placeholder="Ex.: financiamento Caixa, proposta abaixo da tabela…" />
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={showSalePrice} onChange={e => setShowSalePrice(e.target.checked)} className="mt-0.5" />
            <span>Mostrar o valor final no site (por padrão o site mostra só “{isRent ? 'Alugado' : 'Vendido'} em {days !== null ? formatDuration(days) : 'N dias'}”)</span>
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-5 py-4">
          {already ? (
            <Button variant="ghost" size="sm" onClick={undo} disabled={saving}><Undo2 className="h-4 w-4" /> Desfazer e reativar</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
              {already ? 'Atualizar registro' : `Confirmar ${isRent ? 'locação' : 'venda'}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
