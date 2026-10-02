'use client'

/**
 * v1.5 — Ações de cada empreendimento na lista do painel (como na lista de imóveis):
 * ver no site, editar, cadastrar unidade, imóveis vinculados e excluir (com confirmação).
 */
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink, Pencil, Plus, Building2, Trash2, AlertTriangle } from 'lucide-react'

interface Props {
  id: string
  slug: string
  name: string
  published: boolean
  linkedCount: number
  variant?: 'icons' | 'buttons'
}

const icon = 'p-1.5 rounded-md text-gray-400 transition-colors'

export function EmpreendimentoRowActions({ id, slug, name, published, linkedCount, variant = 'icons' }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function remove() {
    setDeleting(true); setError(null)
    try {
      const res = await fetch(`/api/empreendimentos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setConfirming(false)
      startTransition(() => router.refresh())
    } catch {
      setError('Não foi possível excluir. Tente de novo.')
    } finally { setDeleting(false) }
  }

  const dialog = confirming && (
    <div role="dialog" aria-modal="true" aria-labelledby={`del-${id}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 text-left shadow-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <h2 id={`del-${id}`} className="font-semibold text-gray-900">Excluir “{name}”?</h2>
            <p className="mt-1 text-sm text-gray-600">
              Fotos, plantas, blocos e unidades do empreendimento serão apagados. Esta ação não pode ser desfeita.
              {linkedCount > 0 && ` ${linkedCount} ${linkedCount === 1 ? 'imóvel vinculado continua cadastrado' : 'imóveis vinculados continuam cadastrados'}, mas ${linkedCount === 1 ? 'fica' : 'ficam'} sem empreendimento.`}
            </p>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
          <button type="button" onClick={() => { void remove() }} disabled={deleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {deleting ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )

  if (variant === 'buttons') {
    return (
      <>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <Link href={`/admin/empreendimentos/${id}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#1e3a8a] py-1.5 text-xs font-medium text-[#1e3a8a] hover:bg-indigo-50">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Link>
          <Link href={`/admin/imoveis/novo?empreendimento=${id}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#2563eb] py-1.5 text-xs font-medium text-[#2563eb] hover:bg-blue-50">
            <Plus className="h-3.5 w-3.5" /> Unidade
          </Link>
          {published && (
            <a href={`/empreendimentos/${slug}`} target="_blank" rel="noopener noreferrer" aria-label={`Ver ${name} no site`} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button type="button" onClick={() => setConfirming(true)} aria-label={`Excluir ${name}`} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {dialog}
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {published && (
          <a href={`/empreendimentos/${slug}`} target="_blank" rel="noopener noreferrer" title="Ver no site" aria-label={`Ver ${name} no site`} className={`${icon} hover:bg-blue-50 hover:text-[#2563eb]`}>
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <Link href={`/admin/imoveis?empreendimento=${id}`} title={`Imóveis vinculados (${linkedCount})`} aria-label={`Imóveis vinculados a ${name}`} className={`${icon} hover:bg-gray-100 hover:text-gray-700`}>
          <Building2 className="h-4 w-4" />
        </Link>
        <Link href={`/admin/imoveis/novo?empreendimento=${id}`} title="Cadastrar unidade" aria-label={`Cadastrar unidade de ${name}`} className={`${icon} hover:bg-blue-50 hover:text-[#2563eb]`}>
          <Plus className="h-4 w-4" />
        </Link>
        <Link href={`/admin/empreendimentos/${id}`} title="Editar" aria-label={`Editar ${name}`} className={`${icon} hover:bg-indigo-50 hover:text-[#1e3a8a]`}>
          <Pencil className="h-4 w-4" />
        </Link>
        <button type="button" onClick={() => setConfirming(true)} title="Excluir" aria-label={`Excluir ${name}`} className={`${icon} hover:bg-red-50 hover:text-red-600`}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {dialog}
    </>
  )
}
