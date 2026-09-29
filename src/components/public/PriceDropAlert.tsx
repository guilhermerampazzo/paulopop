'use client'

/**
 * v1.3 — "Avise-me se baixar o preço": botão + modal simples que grava em POST /api/alertas
 * com criteria { kind: 'price_drop', propertyId }.
 */
import { useEffect, useId, useState } from 'react'
import { BellRing, Loader2, X, Check } from 'lucide-react'
import { trackEvent } from '@/components/public/Analytics'

interface Props { propertyId: string; propertyRef: string; className?: string }

export function PriceDropAlert({ propertyId, propertyRef, className }: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (phone.replace(/\D/g, '').length < 10) { setError('Informe um WhatsApp com DDD.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/alertas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || undefined, phone, email: email || undefined, criteria: { kind: 'price_drop', propertyId } }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Não foi possível salvar o alerta')
      setDone(true)
      trackEvent('generate_lead', { lead_type: 'price_drop_alert', item_id: propertyRef })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? 'inline-flex items-center gap-2 rounded-full border border-[#1e3a8a] px-4 py-2 text-sm font-semibold text-[#1e3a8a] hover:bg-[#eff6ff]'}
      >
        <BellRing className="w-4 h-4" /> Avise-me se baixar o preço
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 p-4 print:hidden" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 id={`${id}-t`} className="font-display text-lg font-bold text-[#1e3a8a]">Alerta de preço</h2>
                <p className="text-sm text-gray-500">Avisamos pelo WhatsApp se o imóvel <strong>{propertyRef}</strong> baixar de preço.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>

            {done ? (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800 flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5" /> Alerta criado! Você receberá uma mensagem se o preço cair.
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label htmlFor={`${id}-name`} className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                  <input id={`${id}-name`} value={name} onChange={e => setName(e.target.value)} maxLength={150} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]" />
                </div>
                <div>
                  <label htmlFor={`${id}-phone`} className="block text-xs font-medium text-gray-600 mb-1">WhatsApp (com DDD) *</label>
                  <input id={`${id}-phone`} value={phone} onChange={e => setPhone(e.target.value)} required inputMode="tel" placeholder="(61) 99999-9999" maxLength={30} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]" />
                </div>
                <div>
                  <label htmlFor={`${id}-email`} className="block text-xs font-medium text-gray-600 mb-1">E-mail (opcional)</label>
                  <input id={`${id}-email`} type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={200} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]" />
                </div>
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-60 text-white rounded-lg px-4 py-2.5 text-sm font-medium">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />} Criar alerta
                </button>
                <p className="text-[11px] text-gray-400">Seus dados são usados só para este aviso.</p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
