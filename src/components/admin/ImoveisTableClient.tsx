'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, Pencil, Trash2, ExternalLink, CheckCircle,
  AlertTriangle, X, ChevronDown, Eye,
} from 'lucide-react'
import { Badge, propertyStatusBadge, propertyStatusLabel } from '@/components/ui/Badge'
import { formatCurrency, formatArea, formatDate } from '@/lib/formatters'

interface PropertyRow {
  id: string
  ref: string
  title: string | null
  propertyType: string | null
  status: string
  transactionType: string
  price: string | null
  totalArea: string | null
  city: string | null
  state: string | null
  neighborhood: string | null
  slug: string | null
  createdAt: string
  images: { thumbnailUrl: string | null; url: string }[]
  agent: { name: string }
}

interface Props {
  properties: PropertyRow[]
  total: number
  page: number
  totalPages: number
  searchParams: Record<string, string>
}

const STATUS_OPTIONS = [
  { value: 'DRAFT',     label: 'Rascunho' },
  { value: 'ACTIVE',    label: 'Ativo' },
  { value: 'SOLD',      label: 'Vendido' },
  { value: 'RENTED',    label: 'Alugado' },
  { value: 'INACTIVE',  label: 'Inativo' },
  { value: 'SUSPENDED', label: 'Suspenso' },
]

export function ImoveisTableClient({ properties, total, page, totalPages, searchParams }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Seleção
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const allSelected = selected.size === properties.length && properties.length > 0
  const someSelected = selected.size > 0

  // Modal de confirmação de exclusão
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Dropdown de status em massa
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(properties.map(p => p.id)))
    }
  }

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleDelete(ids: string[]) {
    setDeleting(true)
    try {
      const res = await fetch('/api/imoveis/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids }),
      })
      if (!res.ok) throw new Error('Falha ao excluir')
      const { count } = await res.json()
      showToast('success', `${count} imóvel${count !== 1 ? 'is' : ''} excluído${count !== 1 ? 's' : ''} com sucesso.`)
      setSelected(new Set())
      setDeleteTarget(null)
      startTransition(() => router.refresh())
    } catch {
      showToast('error', 'Erro ao excluir. Tente novamente.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleBulkStatus(status: string) {
    setShowStatusMenu(false)
    const ids = Array.from(selected)
    try {
      const res = await fetch('/api/imoveis/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', ids, status }),
      })
      if (!res.ok) throw new Error('Falha ao alterar status')
      const { count } = await res.json()
      const label = STATUS_OPTIONS.find(s => s.value === status)?.label ?? status
      showToast('success', `Status de ${count} imóvel${count !== 1 ? 'is' : ''} alterado para "${label}".`)
      setSelected(new Set())
      startTransition(() => router.refresh())
    } catch {
      showToast('error', 'Erro ao alterar status. Tente novamente.')
    }
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white max-w-sm ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra de ações em massa */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-[#1e3a8a] text-white rounded-xl text-sm font-medium animate-in slide-in-from-top-1">
          <span className="shrink-0">
            {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
          </span>
          <div className="flex-1" />

          {/* Alterar status em massa */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStatusMenu(v => !v)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Alterar status
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-100 py-1 min-w-[160px] z-20">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleBulkStatus(opt.value)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Excluir em massa */}
          <button
            type="button"
            onClick={() =>
              setDeleteTarget({
                ids: Array.from(selected),
                label: `${selected.size} imóvel${selected.size !== 1 ? 'is' : ''} selecionado${selected.size !== 1 ? 's' : ''}`,
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>

          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Cancelar seleção"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Contador */}
      <div className="flex items-center justify-between mb-2 text-sm text-gray-500">
        <span>
          {total} imóvel{total !== 1 ? 'is' : ''} encontrado{total !== 1 ? 's' : ''}
          {isPending && <span className="ml-2 text-xs text-gray-400">Atualizando...</span>}
        </span>
        {totalPages > 1 && <span>Página {page} de {totalPages}</span>}
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum imóvel encontrado</p>
          <p className="text-sm text-gray-400 mt-1">Tente ajustar os filtros ou cadastre um novo imóvel.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Selecionar todos"
                      className="w-4 h-4 rounded border-gray-300 accent-[#1e3a8a] cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Imóvel</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Preço</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Área</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Corretor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cadastro</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {properties.map(p => (
                  <tr
                    key={p.id}
                    className={`transition-colors ${selected.has(p.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleRow(p.id)}
                        aria-label={`Selecionar ${p.ref}`}
                        className="w-4 h-4 rounded border-gray-300 accent-[#1e3a8a] cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                          {p.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.images[0].thumbnailUrl ?? p.images[0].url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-6 h-6 m-auto mt-2 text-gray-300" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 truncate max-w-[200px]">
                            {p.title ?? `${p.propertyType ?? 'Imóvel'} — ${p.neighborhood ?? p.city}`}
                          </p>
                          <p className="text-xs text-gray-400">{p.ref}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.propertyType ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={propertyStatusBadge[p.status]} size="sm">
                        {propertyStatusLabel[p.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {p.price ? formatCurrency(Number(p.price)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.totalArea ? formatArea(Number(p.totalArea)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.agent.name}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Ver no site */}
                        {p.status === 'ACTIVE' && p.slug && (
                          <a
                            href={`/imoveis/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver no site"
                            aria-label={`Ver ${p.ref} no site`}
                            className="p-1.5 text-gray-400 hover:text-[#2563eb] hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {/* Visualizar (preview mesmo em rascunho) */}
                        {p.slug && (
                          <a
                            href={`/imoveis/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Visualizar"
                            aria-label={`Visualizar ${p.ref}`}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        )}
                        {/* Editar */}
                        <Link
                          href={`/admin/imoveis/${p.id}`}
                          title="Editar"
                          aria-label={`Editar ${p.ref}`}
                          className="p-1.5 text-gray-400 hover:text-[#1e3a8a] hover:bg-indigo-50 rounded-md transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        {/* Excluir */}
                        <button
                          type="button"
                          title="Excluir"
                          aria-label={`Excluir ${p.ref}`}
                          onClick={() =>
                            setDeleteTarget({ ids: [p.id], label: `"${p.title ?? p.ref}"` })
                          }
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {properties.map(p => (
              <div
                key={p.id}
                className={`bg-white rounded-xl border p-4 transition-colors ${
                  selected.has(p.id) ? 'border-[#1e3a8a] bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleRow(p.id)}
                    aria-label={`Selecionar ${p.ref}`}
                    className="mt-1 w-4 h-4 rounded border-gray-300 accent-[#1e3a8a]"
                  />
                  {/* Thumbnail */}
                  <div className="w-16 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.images[0].thumbnailUrl ?? p.images[0].url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="w-6 h-6 m-auto mt-4 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">
                      {p.title ?? `${p.propertyType ?? 'Imóvel'} — ${p.city}`}
                    </p>
                    <p className="text-xs text-gray-400 mb-1">{p.ref}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={propertyStatusBadge[p.status]} size="sm">
                        {propertyStatusLabel[p.status]}
                      </Badge>
                      {p.price && (
                        <span className="text-xs font-semibold text-[#1e3a8a]">
                          {formatCurrency(Number(p.price))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Ações mobile */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Link
                    href={`/admin/imoveis/${p.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-[#1e3a8a] border border-[#1e3a8a] rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </Link>
                  {p.slug && (
                    <a
                      href={`/imoveis/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ ids: [p.id], label: `"${p.title ?? p.ref}"` })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p2 = i + 1
            return (
              <Link
                key={p2}
                href={`?${new URLSearchParams({ ...searchParams, page: String(p2) })}`}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  p2 === page
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1e3a8a] hover:text-[#1e3a8a]'
                }`}
              >
                {p2}
              </Link>
            )
          })}
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 id="delete-modal-title" className="text-base font-semibold text-gray-900">
                  Confirmar exclusão
                </h2>
                <p className="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Tem certeza que deseja excluir {deleteTarget.label}?
              {deleteTarget.ids.length > 1 && (
                <> Todos os dados, imagens e documentos associados serão perdidos.</>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTarget.ids)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {deleting ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
