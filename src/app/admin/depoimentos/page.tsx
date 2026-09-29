'use client'

import { useState, useEffect } from 'react'
import { MessageSquareQuote, Plus, Pencil, Trash2, Check, X, Star, Loader2, CheckCircle, AlertCircle, Save } from 'lucide-react'

interface Depoimento {
  id: string
  name: string
  role?: string
  text: string
  rating: number
  avatarUrl?: string
  source?: string
  approved: boolean
  createdAt: string
}

interface FormData {
  name: string
  role: string
  text: string
  rating: number
  source: string
  approved: boolean
}

const EMPTY_FORM: FormData = { name: '', role: '', text: '', rating: 5, source: 'manual', approved: true }

export default function DepoimentosPage() {
  const [items, setItems] = useState<Depoimento[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'novo' | Depoimento | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')

  function load() {
    fetch('/api/admin/depoimentos')
      .then(r => r.json())
      .then((data: Depoimento[]) => setItems(data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openNovo() {
    setForm(EMPTY_FORM)
    setModal('novo')
  }

  function openEdit(d: Depoimento) {
    setForm({ name: d.name, role: d.role ?? '', text: d.text, rating: d.rating, source: d.source ?? 'manual', approved: d.approved })
    setModal(d)
  }

  async function handleSave() {
    setSaving(true)
    setFeedback(null)
    try {
      const isNew = modal === 'novo'
      const url = isNew ? '/api/admin/depoimentos' : `/api/admin/depoimentos/${(modal as Depoimento).id}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setFeedback({ type: 'success', msg: isNew ? 'Depoimento cadastrado!' : 'Depoimento atualizado!' })
      setModal(null)
      load()
    } catch {
      setFeedback({ type: 'error', msg: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleApproved(d: Depoimento) {
    await fetch(`/api/admin/depoimentos/${d.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: !d.approved }),
    })
    load()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/depoimentos/${id}`, { method: 'DELETE' })
    setDeleteId(null)
    load()
  }

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const filtered = items.filter(d => {
    if (filter === 'pending') return !d.approved
    if (filter === 'approved') return d.approved
    return true
  })

  const pendingCount = items.filter(d => !d.approved).length

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a8a] flex items-center gap-2">
            <MessageSquareQuote className="w-6 h-6" /> Depoimentos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gerencie os depoimentos de clientes exibidos no site
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium">
                {pendingCount} pendente{pendingCount > 1 ? 's' : ''} de aprovação
              </span>
            )}
          </p>
        </div>
        <button
          onClick={openNovo}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white text-sm font-medium rounded-lg hover:bg-[#172554] transition-colors"
          aria-label="Adicionar depoimento"
        >
          <Plus className="w-4 h-4" /> Adicionar Depoimento
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          role="alert"
          aria-live="polite"
          className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.type === 'success'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {feedback.msg}
          <button onClick={() => setFeedback(null)} className="ml-auto" aria-label="Fechar alerta"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'pending', label: `Pendentes (${pendingCount})` },
          { id: 'approved', label: 'Aprovados' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as typeof filter)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.id ? 'bg-[#1e3a8a] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Nota sobre integração Google */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-700">
        <strong>Dica:</strong> Para exibir avaliações do Google, adicione o widget do Google Meu Negócio diretamente na página via código HTML personalizado ou use um serviço como <strong>Elfsight</strong> ou <strong>Widgetic</strong> para incorporar o feed do Google Reviews.
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
              Nenhum depoimento encontrado
            </div>
          )}
          {filtered.map(d => (
            <div
              key={d.id}
              className={`bg-white rounded-xl border p-4 ${d.approved ? 'border-gray-200' : 'border-amber-200 bg-amber-50/30'}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{d.name}</span>
                    {d.role && <span className="text-xs text-gray-500">· {d.role}</span>}
                    <span className={`ml-1 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      d.approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {d.approved ? 'Aprovado' : 'Pendente'}
                    </span>
                    {d.source && d.source !== 'manual' && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">{d.source}</span>
                    )}
                  </div>
                  <div className="flex gap-0.5 mb-2">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} className={`w-4 h-4 ${n <= d.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{d.text}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(d.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleApproved(d)}
                    className={`p-1.5 rounded hover:bg-gray-100 ${d.approved ? 'text-amber-500 hover:text-amber-700' : 'text-green-500 hover:text-green-700'}`}
                    aria-label={d.approved ? 'Reprovar depoimento' : 'Aprovar depoimento'}
                    title={d.approved ? 'Reprovar' : 'Aprovar'}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEdit(d)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#1e3a8a]"
                    aria-label={`Editar depoimento de ${d.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(d.id)}
                    className="p-1.5 rounded hover:bg-gray-100 text-red-400 hover:text-red-600"
                    aria-label={`Excluir depoimento de ${d.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de cadastro/edição */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-[#1e3a8a]">
                {modal === 'novo' ? 'Adicionar Depoimento' : 'Editar Depoimento'}
              </h2>
              <button onClick={() => setModal(null)} aria-label="Fechar modal">
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  aria-label="Nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo / Descrição</label>
                <input
                  value={form.role}
                  onChange={e => set('role', e.target.value)}
                  placeholder="ex: Cliente comprador, Proprietário..."
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  aria-label="Cargo ou descrição"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Depoimento *</label>
                <textarea
                  value={form.text}
                  onChange={e => set('text', e.target.value)}
                  rows={4}
                  maxLength={1000}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  aria-label="Texto do depoimento"
                />
                <p className="text-xs text-gray-400 mt-1">{form.text.length}/1000</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avaliação</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set('rating', n)}
                      aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                    >
                      <Star className={`w-6 h-6 transition-colors ${n <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="approved-check"
                  type="checkbox"
                  checked={form.approved}
                  onChange={e => set('approved', e.target.checked)}
                  className="w-4 h-4 accent-[#2563eb]"
                  aria-label="Aprovado para exibição"
                />
                <label htmlFor="approved-check" className="text-sm text-gray-700">Aprovado para exibição no site</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.text}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white rounded-xl text-sm font-medium hover:bg-[#172554] disabled:opacity-60"
                aria-label="Salvar depoimento"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de exclusão */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir depoimento</h3>
            <p className="text-sm text-gray-500 mb-6">Tem certeza que deseja excluir este depoimento? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-100">
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
