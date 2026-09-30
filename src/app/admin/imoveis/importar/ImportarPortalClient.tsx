'use client'

/**
 * v1.4 — Importar anúncio de outros portais (DF Imóveis, WImóveis, OLX, VivaReal, ZAP, Imovelweb, Chaves na Mão)
 * por link, ou de um texto colado. Dois passos: ler → conferir → criar rascunho.
 * Nada vai ao ar sozinho; as fotos do anúncio só são copiadas com a confirmação de autorização.
 */
import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Link2, ClipboardPaste, CheckCircle2, AlertTriangle, Pencil, ArrowLeft } from 'lucide-react'

interface Draft {
  url: string | null; portal: string | null; portalSlug: string | null; externalId: string | null
  title: string | null; description: string | null; propertyType: string | null; transactionType: 'SALE' | 'RENT' | null
  price: number | null; condoFee: number | null; iptu: number | null; usefulArea: number | null; totalArea: number | null
  bedrooms: number | null; suites: number | null; bathrooms: number | null; parking: number | null; floor: string | null
  address: string | null; neighborhood: string | null; city: string | null; state: string | null; zipCode: string | null
  advertiser: string | null; photoUrls: string[]; features: string[]; filled: string[]
}
interface Result { id: string; ref: string; slug: string; created: boolean; status: string; images: number; imagesPending: number; imagesFailed: number; warnings: string[] }

const TYPES = ['Apartamento', 'Casa', 'Sobrado', 'Casa em Condomínio', 'Kitnet', 'Studio', 'Cobertura', 'Flat', 'Terreno', 'Sala Comercial', 'Loja', 'Galpão', 'Prédio', 'Chácara']
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]'

export function ImportarPortalClient({ mode }: { mode: 'link' | 'texto' }) {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [auth, setAuth] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  async function post(body: Record<string, unknown>) {
    const res = await fetch('/api/admin/importar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    return { ok: res.ok, data: await res.json().catch(() => ({})) }
  }

  async function read(e?: React.FormEvent) {
    e?.preventDefault()
    setLoading(true); setError(null); setResult(null); setBlocked(false)
    try {
      const r = await post({ step: 'ler', url: url.trim() || undefined, text: mode === 'texto' || blocked ? text : undefined })
      if (!r.ok) { setError(r.data.error ?? 'Não foi possível ler o anúncio.'); setBlocked(!!r.data.blocked); return }
      setDraft(r.data.draft as Draft)
    } catch { setError('Sem conexão com o servidor. Tente de novo.') } finally { setLoading(false) }
  }

  async function create() {
    if (!draft) return
    setLoading(true); setError(null)
    try {
      const r = await post({ step: 'criar', draft, authConfirmed: auth })
      if (!r.ok) { setError(r.data.error ?? 'Não foi possível criar o cadastro.'); return }
      setResult(r.data as Result); setDraft(null); setUrl(''); setText(''); setAuth(false)
    } catch { setError('Sem conexão com o servidor. Tente de novo.') } finally { setLoading(false) }
  }

  const setF = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => (d ? { ...d, [k]: v } : d))
  const numF = (k: 'price' | 'condoFee' | 'iptu' | 'usefulArea' | 'totalArea' | 'bedrooms' | 'suites' | 'bathrooms' | 'parking', label: string) => (
    <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`imp-${k}`}>{label}</label>
      <input id={`imp-${k}`} type="number" value={draft?.[k] ?? ''} onChange={e => setF(k, e.target.value === '' ? null : Number(e.target.value))} className={`${inputCls} ${draft && draft[k] == null ? 'border-amber-300 bg-amber-50' : ''}`} /></div>
  )
  const txtF = (k: 'title' | 'address' | 'neighborhood' | 'city' | 'floor' | 'advertiser', label: string, span = 1) => (
    <div className={span === 2 ? 'md:col-span-2' : span === 4 ? 'md:col-span-4' : ''}><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`imp-${k}`}>{label}</label>
      <input id={`imp-${k}`} value={draft?.[k] ?? ''} onChange={e => setF(k, e.target.value || null)} className={inputCls} /></div>
  )

  return (
    <div className="space-y-6">
      {!draft && (
        <form onSubmit={read} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label htmlFor="portal-url" className="block text-sm font-semibold text-[#1e3a8a]">{mode === 'link' ? 'Link do anúncio' : 'Link do anúncio (opcional)'}</label>
            <div className="relative mt-2">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input id="portal-url" type="url" inputMode="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.dfimoveis.com.br/imovel/…  ·  wimoveis.com.br  ·  olx.com.br" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]" disabled={loading} />
            </div>
          </div>
          {(mode === 'texto' || blocked) && (
            <div>
              <label htmlFor="portal-text" className="block text-sm font-semibold text-[#1e3a8a]">Texto do anúncio</label>
              <p className="text-xs text-gray-500 mt-1">Abra o anúncio, selecione tudo (Ctrl+A), copie (Ctrl+C) e cole aqui (Ctrl+V). Serve também para texto de WhatsApp ou de uma ficha.</p>
              <textarea id="portal-text" rows={8} value={text} onChange={e => setText(e.target.value)} className="mt-2 w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]" placeholder="Apartamento 2 quartos QR 303 Samambaia Sul&#10;R$ 250.000&#10;52 m² úteis · 1 vaga · 2º andar…" />
            </div>
          )}
          <button type="submit" disabled={loading || (mode === 'link' && !blocked ? !url.trim() : text.trim().length < 20)} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1e3a8a] text-white text-sm font-medium rounded-lg hover:bg-[#172554] disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'texto' || blocked ? <ClipboardPaste className="w-4 h-4" /> : <Link2 className="w-4 h-4" />} Ler anúncio
          </button>
          <p className="text-xs text-gray-500">O site lê o anúncio e mostra os campos para você conferir. O cadastro entra como <b>rascunho</b>; nada é publicado sozinho.</p>
        </form>
      )}

      {error && (
        <div role="alert" className="flex gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" /><p>{error}</p>
        </div>
      )}

      {draft && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4" data-testid="importar-conferir">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#1e3a8a]">Confira os dados lidos{draft.portal ? ` · ${draft.portal}` : ''}</h2>
            <button type="button" onClick={() => setDraft(null)} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:underline"><ArrowLeft className="w-3.5 h-3.5" /> Ler outro anúncio</button>
          </div>
          <p className="text-xs text-gray-500">Campos em amarelo não foram encontrados no anúncio: ficam vazios (o site não inventa dados). Preencha se souber.</p>
          <div className="grid gap-3 md:grid-cols-4">
            {txtF('title', 'Título', 4)}
            <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="imp-type">Tipo</label>
              <select id="imp-type" value={draft.propertyType ?? ''} onChange={e => setF('propertyType', e.target.value || null)} className={`${inputCls} ${!draft.propertyType ? 'border-amber-300 bg-amber-50' : ''}`}><option value="">—</option>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="imp-tx">Negócio</label>
              <select id="imp-tx" value={draft.transactionType ?? 'SALE'} onChange={e => setF('transactionType', e.target.value as 'SALE' | 'RENT')} className={inputCls}><option value="SALE">Venda</option><option value="RENT">Aluguel</option></select></div>
            {numF('price', 'Preço (R$)')}
            {numF('usefulArea', 'Área útil/privativa (m²)')}
            {numF('totalArea', 'Área total (m²)')}
            {numF('bedrooms', 'Quartos')}
            {numF('suites', 'Suítes')}
            {numF('bathrooms', 'Banheiros')}
            {numF('parking', 'Vagas')}
            {numF('condoFee', 'Condomínio (R$/mês)')}
            {numF('iptu', 'IPTU (R$)')}
            {txtF('floor', 'Andar')}
            {txtF('address', 'Endereço', 2)}
            {txtF('neighborhood', 'Bairro')}
            {txtF('city', 'Cidade')}
            {txtF('advertiser', 'Anunciante no portal', 2)}
          </div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="imp-desc">Descrição</label>
            <textarea id="imp-desc" rows={5} value={draft.description ?? ''} onChange={e => setF('description', e.target.value || null)} className={inputCls} /></div>
          {draft.price != null && (draft.usefulArea ?? draft.totalArea) ? <p className="text-sm text-gray-700">Preço por m²: <b>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(draft.price / ((draft.usefulArea ?? draft.totalArea) as number))}</b> (calculado pelo sistema)</p> : null}
          <p className="text-sm text-gray-700">{draft.photoUrls.length} foto(s) encontradas no anúncio.</p>

          <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <input type="checkbox" className="mt-1" checked={auth} onChange={e => setAuth(e.target.checked)} />
            <span><b>Confirmo que este anúncio é meu ou que tenho autorização escrita do proprietário</b> para anunciar este imóvel e usar as fotos. <span className="block text-xs mt-1">Sem marcar: o cadastro é criado só com os dados, sem copiar as fotos, e o painel vai pedir esta confirmação antes de publicar (Lei 6.530/78, art. 20, III).</span></span>
          </label>
          <button type="button" onClick={create} disabled={loading} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#ea580c] text-white text-sm font-medium rounded-lg hover:bg-[#c2410c] disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Criar rascunho{auth && draft.photoUrls.length ? ' e copiar as fotos' : ''}
          </button>
          {loading && auth && draft.photoUrls.length > 0 && <p className="text-sm text-gray-500">Baixando as fotos… pode levar até 1 minuto.</p>}
        </div>
      )}

      {result && (
        <div className="p-5 rounded-xl border border-green-200 bg-green-50 text-sm text-green-900 space-y-2">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="w-5 h-5" />{result.created ? 'Rascunho criado' : 'Este anúncio já estava cadastrado'} · Ref {result.ref}</p>
          <p>{result.images} foto(s) copiada(s){result.imagesPending ? ` · ${result.imagesPending} aguardando a confirmação de autorização` : ''}{result.imagesFailed ? ` · ${result.imagesFailed} com erro` : ''}.</p>
          {result.warnings.map(w => <p key={w} className="text-amber-800">⚠ {w}</p>)}
          <Link href={`/admin/imoveis/${result.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-300 rounded-lg"><Pencil className="w-4 h-4" /> Revisar e completar no painel</Link>
        </div>
      )}
    </div>
  )
}
