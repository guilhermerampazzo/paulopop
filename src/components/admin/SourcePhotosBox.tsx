'use client'

/**
 * v1.4 — fotos do anúncio de origem (importado de portal) que ainda não foram copiadas para o site.
 * A cópia só acontece depois que o corretor confirma que o anúncio é dele ou que tem autorização escrita.
 */
import { useState } from 'react'
import { Loader2, ImageDown } from 'lucide-react'

export function SourcePhotosBox({ propertyId, count, confirmed }: { propertyId: string; count: number; confirmed: boolean }) {
  const [ok, setOk] = useState(confirmed)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  if (count <= 0) return null

  async function bring() {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch(`/api/admin/imoveis/${propertyId}/fotos-origem`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg(d.error ?? 'Não foi possível copiar as fotos.'); return }
      setMsg(`${d.added} foto(s) copiada(s)${d.failed ? `; ${d.failed} não puderam ser baixadas` : ''}. Atualizando a página…`)
      setTimeout(() => window.location.reload(), 1200)
    } catch { setMsg('Sem conexão com o servidor.') } finally { setBusy(false) }
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" data-testid="fotos-origem">
      <p className="font-medium">{count} foto(s) do anúncio original ainda não foram copiadas para o site.</p>
      <label className="mt-2 flex items-start gap-2">
        <input type="checkbox" className="mt-0.5" checked={ok} onChange={e => setOk(e.target.checked)} />
        <span>Confirmo que este anúncio é meu ou que tenho autorização escrita do proprietário para anunciar este imóvel e usar estas fotos.</span>
      </label>
      <button type="button" onClick={bring} disabled={!ok || busy} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageDown className="h-3.5 w-3.5" />} Copiar fotos para o site
      </button>
      {msg && <p className="mt-2" role="status">{msg}</p>}
    </div>
  )
}
