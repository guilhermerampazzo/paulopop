'use client'

/** v1.2 — Estudos de mercado: lista, busca e criação (em branco ou a partir de um imóvel cadastrado). */
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Search, FileBarChart2, Loader2, ExternalLink } from 'lucide-react'
import { fmtBRL } from '@/lib/market-study'

interface Item { id: string; title: string; preparedFor: string | null; status: string; studyDate: string; updatedAt: string; city: string | null; neighborhood: string | null; results: { values?: { market?: number | null }; nValid?: number } | null; publicToken: string | null; agent: { name: string }; _count: { samples: number } }
interface PropOpt { id: string; ref: string; title: string | null; city: string | null }

function EstudosInner() {
  const router = useRouter()
  const search = useSearchParams()
  const presetProp = search.get('propertyId') ?? ''
  const [items, setItems] = useState<Item[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(!!presetProp)
  const [props, setProps] = useState<PropOpt[]>([])
  const [propId, setPropId] = useState(presetProp)
  const [title, setTitle] = useState('')
  const [owner, setOwner] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      fetch(`/api/admin/estudos?q=${encodeURIComponent(q)}`).then(r => r.json()).then(d => setItems(d.items ?? [])).finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    if (!showNew || props.length) return
    fetch('/api/imoveis?admin=true&limit=50').then(r => r.json()).then(d => setProps((d.properties ?? []).map((p: PropOpt) => ({ id: p.id, ref: p.ref, title: p.title, city: p.city })))).catch(() => {})
  }, [showNew, props.length])

  async function create() {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/estudos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId: propId || undefined, title: title || undefined, preparedFor: owner || undefined }) })
      const d = await res.json()
      if (res.ok) router.push(`/admin/estudos/${d.id}`)
    } finally { setCreating(false) }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por imóvel, proprietário ou endereço" className={`${inputCls} pl-9`} aria-label="Buscar estudos" />
        </div>
        <button type="button" onClick={() => setShowNew(v => !v)} className="inline-flex items-center gap-2 rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-medium text-white hover:bg-[#c2410c]"><Plus className="h-4 w-4" /> Novo estudo</button>
      </div>

      {showNew && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold text-[#1e3a8a]">Novo estudo de mercado</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="ne-prop">A partir de um imóvel cadastrado (opcional)</label>
              <select id="ne-prop" value={propId} onChange={e => setPropId(e.target.value)} className={inputCls}>
                <option value="">— Em branco —</option>
                {props.map(p => <option key={p.id} value={p.id}>{p.ref} · {p.title ?? p.city ?? ''}</option>)}
              </select>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="ne-title">Imóvel (título curto)</label><input id="ne-title" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="Apto 304 Bl. B – Residencial Parque Riacho 21" /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="ne-owner">Preparado para</label><input id="ne-owner" value={owner} onChange={e => setOwner(e.target.value)} className={inputCls} placeholder="Nome do proprietário" /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNew(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
            <button type="button" onClick={create} disabled={creating} className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBarChart2 className="h-4 w-4" />} Criar e abrir</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#F0F4F8] text-left text-xs uppercase tracking-wide text-gray-500">
            <tr><th className="px-4 py-3">Imóvel</th><th className="px-4 py-3">Preparado para</th><th className="px-4 py-3">Amostras</th><th className="px-4 py-3">Valor de mercado</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3">Atualizado</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum estudo ainda. Clique em “Novo estudo”.</td></tr>}
            {!loading && items.map(i => (
              <tr key={i.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/admin/estudos/${i.id}`)}>
                <td className="px-4 py-3"><p className="font-medium text-[#1e3a8a]">{i.title}</p><p className="text-xs text-gray-400">{[i.neighborhood, i.city].filter(Boolean).join(' · ')} · {i.agent.name}</p></td>
                <td className="px-4 py-3">{i.preparedFor ?? '—'}</td>
                <td className="px-4 py-3">{i._count.samples}{i.results?.nValid != null ? ` (${i.results.nValid} válidas)` : ''}</td>
                <td className="px-4 py-3 font-semibold">{fmtBRL(i.results?.values?.market ?? null, 0)}</td>
                <td className="px-4 py-3">{i.status === 'DONE' ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Concluído</span> : <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">Rascunho</span>}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(i.updatedAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 text-right">{i.publicToken && i.status === 'DONE' && <a href={`/estudo/${i.publicToken}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-[#2563eb] hover:underline"><ExternalLink className="h-3 w-3" /> Relatório</a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function EstudosPage() {
  return <Suspense fallback={null}><EstudosInner /></Suspense>
}
