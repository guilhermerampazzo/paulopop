'use client'

/**
 * v1.3 — Painel › Parceiros: lista com filtro por tipo, status, destaque e ordem; criação rápida.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Handshake, Loader2, Plus, Star, Trash2 } from 'lucide-react'
import { PARTNER_TYPES, PARTNER_TYPE_LABEL, partnerTypeLabel } from '@/lib/partners'

interface Row { id: string; slug: string; name: string; type: string; tagline: string | null; status: string; order: number; featured: boolean; logoUrl: string | null }

const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white'

export default function AdminParceirosPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('CONSTRUTORA')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/parceiros').then(async r => setRows(r.ok ? await r.json() : [])).finally(() => setLoading(false))
  }, [])

  async function create() {
    if (!name.trim()) return
    setCreating(true); setError('')
    try {
      const r = await fetch('/api/admin/parceiros', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), type }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? 'Falha ao criar')
      window.location.href = `/admin/parceiros/${d.id}`
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao criar'); setCreating(false)
    }
  }

  async function remove(row: Row) {
    if (!confirm(`Excluir o parceiro ${row.name}?`)) return
    const r = await fetch(`/api/admin/parceiros/${row.id}`, { method: 'DELETE' })
    if (r.ok) setRows(rs => rs.filter(x => x.id !== row.id))
  }

  const shown = rows.filter(r => !filterType || r.type === filterType)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a8a]">Parceiros</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} parceiro{rows.length !== 1 ? 's' : ''} · {rows.filter(r => r.status === 'PUBLISHED').length} publicado(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filter-type" className="sr-only">Filtrar por tipo</label>
          <select id="filter-type" value={filterType} onChange={e => setFilterType(e.target.value)} className={inputCls}>
            <option value="">Todos os tipos</option>
            {PARTNER_TYPES.map(t => <option key={t} value={t}>{PARTNER_TYPE_LABEL[t]}</option>)}
          </select>
          <button type="button" onClick={() => setShowNew(s => !s)} className="inline-flex items-center gap-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap">
            <Plus className="w-4 h-4" /> Novo parceiro
          </button>
        </div>
      </div>

      {showNew && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input aria-label="Nome do parceiro" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void create() }} placeholder="Nome do parceiro" className={`${inputCls} flex-1`} />
            <label htmlFor="new-type" className="sr-only">Tipo</label>
            <select id="new-type" value={type} onChange={e => setType(e.target.value)} className={inputCls}>
              {PARTNER_TYPES.map(t => <option key={t} value={t}>{PARTNER_TYPE_LABEL[t]}</option>)}
            </select>
            <button type="button" onClick={() => void create()} disabled={creating || !name.trim()} className="inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Criar
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : shown.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Handshake className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum parceiro</p>
          <p className="text-sm text-gray-400 mt-1">Cadastre construtoras, bancos, cartórios e outros parceiros.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ordem</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Parceiro</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{r.order}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                        {r.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.logoUrl} alt="" className="w-full h-full object-contain" />
                        ) : <Handshake className="w-5 h-5 text-gray-300" />}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/parceiros/${r.id}`} className="font-medium text-gray-800 hover:text-[#1e3a8a] inline-flex items-center gap-1">
                          {r.name}{r.featured && <Star className="w-3.5 h-3.5 text-[#ea580c] fill-[#ea580c]" aria-label="Destaque" />}
                        </Link>
                        <p className="text-xs text-gray-400 truncate max-w-xs">/parceiros/{r.slug}{r.tagline ? ` · ${r.tagline}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{partnerTypeLabel(r.type)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${r.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {r.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === 'PUBLISHED' && <a href={`/parceiros/${r.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Ver no site" className="p-1.5 text-gray-400 hover:text-[#1e3a8a]"><ExternalLink className="w-4 h-4" /></a>}
                      <Link href={`/admin/parceiros/${r.id}`} className="text-xs font-medium text-[#1e3a8a] hover:underline px-2">Editar</Link>
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
