'use client'

/**
 * v1.3 — Painel › Cidades do DF: lista das páginas de cidade com status e ordem,
 * e criação de nova cidade com sugestões das regiões administrativas.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Loader2, MapPinned, Plus, Trash2 } from 'lucide-react'
import { DF_CITY_SUGGESTIONS } from '@/lib/df-cities'

interface Row { id: string; slug: string; name: string; tagline: string | null; status: string; order: number; coverUrl: string | null; matchNames: string[]; updatedAt: string }

const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]'

export default function AdminCidadesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/cidades')
      setRows(r.ok ? await r.json() : [])
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function create(n: string) {
    const value = n.trim()
    if (!value) return
    setCreating(true); setError('')
    try {
      const r = await fetch('/api/admin/cidades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: value }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? 'Falha ao criar')
      window.location.href = `/admin/cidades/${d.id}`
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao criar')
      setCreating(false)
    }
  }

  async function remove(row: Row) {
    if (!confirm(`Excluir a página de ${row.name}? Esta ação não pode ser desfeita.`)) return
    const r = await fetch(`/api/admin/cidades/${row.id}`, { method: 'DELETE' })
    if (r.ok) setRows(rs => rs.filter(x => x.id !== row.id))
  }

  const existing = new Set(rows.map(r => r.name.toLowerCase()))
  const suggestions = DF_CITY_SUGGESTIONS.filter(s => !existing.has(s.toLowerCase()))

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a8a]">Cidades do DF</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} página{rows.length !== 1 ? 's' : ''} · {rows.filter(r => r.status === 'PUBLISHED').length} publicada(s)</p>
        </div>
        <button type="button" onClick={() => setShowNew(s => !s)} className="inline-flex items-center gap-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg px-4 py-2 text-sm font-medium">
          <Plus className="w-4 h-4" /> Nova cidade
        </button>
      </div>

      {showNew && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input aria-label="Nome da cidade" list="ra-df" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void create(name) }} placeholder="Nome da cidade / região administrativa" className={`${inputCls} flex-1`} />
            <datalist id="ra-df">{DF_CITY_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
            <button type="button" onClick={() => void create(name)} disabled={creating || !name.trim()} className="inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Criar
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {suggestions.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Sugestões (regiões administrativas ainda sem página):</p>
              <div className="flex flex-wrap gap-1">
                {suggestions.map(s => (
                  <button key={s} type="button" onClick={() => void create(s)} disabled={creating} className="rounded-full border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-[#eff6ff] hover:border-[#1e3a8a]">{s}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <MapPinned className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma página de cidade</p>
          <p className="text-sm text-gray-400 mt-1">Clique em “Nova cidade” e escolha uma região administrativa.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ordem</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cidade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nomes dos imóveis</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{r.order}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                        {r.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.coverUrl} alt="" className="w-full h-full object-cover" />
                        ) : <MapPinned className="w-5 h-5 m-auto mt-2.5 text-gray-300" />}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/cidades/${r.id}`} className="font-medium text-gray-800 hover:text-[#1e3a8a]">{r.name}</Link>
                        <p className="text-xs text-gray-400 truncate max-w-xs">/cidades/{r.slug}{r.tagline ? ` · ${r.tagline}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.matchNames.join(', ')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${r.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {r.status === 'PUBLISHED' ? 'Publicada' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === 'PUBLISHED' && (
                        <a href={`/cidades/${r.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Ver no site" className="p-1.5 text-gray-400 hover:text-[#1e3a8a]"><ExternalLink className="w-4 h-4" /></a>
                      )}
                      <Link href={`/admin/cidades/${r.id}`} className="text-xs font-medium text-[#1e3a8a] hover:underline px-2">Editar</Link>
                      <button type="button" onClick={() => void remove(r)} aria-label="Excluir" className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
