'use client'

/**
 * v1.5 — Menu de ações do empreendimento, no mesmo padrão da barra do cadastro de imóveis:
 * à esquerda as ações (ver no site, compartilhar, cadastrar unidade, imóveis vinculados, excluir);
 * à direita Cancelar, Salvar como rascunho e Salvar e publicar / Salvar alterações.
 * No celular os botões quebram de linha em vez de sair da tela.
 */
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, Share2, Plus, Building2, Trash2, X, Save, CheckCircle, Check } from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'

interface Props {
  id: string
  slug: string | null
  name: string
  status: string
  linkedCount?: number | null
  saving: boolean
  saved?: boolean
  onSave: (status?: 'DRAFT' | 'PUBLISHED') => void
  onDelete: () => void
}

const btn = 'inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors'

export function EmpreendimentoActions({ id, slug, name, status, linkedCount, saving, saved, onSave, onDelete }: Props) {
  const router = useRouter()
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const published = status === 'PUBLISHED'
  const publicPath = slug ? `/empreendimentos/${slug}` : null
  const publicUrl = publicPath && typeof window !== 'undefined' ? `${window.location.origin}${publicPath}` : publicPath ?? ''

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* navegador sem permissão: o link continua visível no menu */ }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white px-4 py-3 md:px-6 lg:left-64">
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {published && publicPath ? (
            <a href={publicPath} target="_blank" rel="noopener noreferrer" className={`${btn} border-gray-200 text-gray-600 hover:bg-gray-50`} aria-label="Ver no site" title="Ver no site">
              <Eye className="h-4 w-4" /><span className="hidden 2xl:inline">Ver no site</span>
            </a>
          ) : (
            <span className={`${btn} cursor-not-allowed border-gray-100 text-gray-300`} title="Publique para ver no site" aria-disabled="true">
              <Eye className="h-4 w-4" /><span className="hidden 2xl:inline">Ver no site</span>
            </span>
          )}

          <div className="relative">
            <button type="button" onClick={() => setShareOpen(v => !v)} disabled={!published || !publicPath}
              className={`${btn} border-gray-200 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40`}
              aria-haspopup="menu" aria-expanded={shareOpen} aria-label="Compartilhar" title="Compartilhar">
              <Share2 className="h-4 w-4" /><span className="hidden 2xl:inline">Compartilhar</span>
            </button>
            {shareOpen && published && publicPath && (
              <div role="menu" className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-gray-100 bg-white py-1 text-sm shadow-xl">
                <a role="menuitem" href={`https://wa.me/?text=${encodeURIComponent(`${name} — ${publicUrl}`)}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50" onClick={() => setShareOpen(false)}>
                  <WhatsAppIcon className="h-4 w-4 text-[#25D366]" /> Enviar pelo WhatsApp
                </a>
                <button role="menuitem" type="button" onClick={() => { void copyLink() }} className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-50">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4 text-gray-500" />} {copied ? 'Link copiado' : 'Copiar link'}
                </button>
                <p className="px-4 pb-2 pt-1 text-[11px] text-gray-400">A prévia mostra a capa (ou a fachada) do empreendimento.</p>
              </div>
            )}
          </div>

          <Link href={`/admin/imoveis/novo?empreendimento=${id}`} className={`${btn} border-[#2563eb] text-[#2563eb] hover:bg-blue-50`} aria-label="Cadastrar unidade deste empreendimento">
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Cadastrar unidade</span>
          </Link>

          <Link href={`/admin/imoveis?empreendimento=${id}`} className={`${btn} border-gray-200 text-gray-600 hover:bg-gray-50`} aria-label="Imóveis vinculados a este empreendimento">
            <Building2 className="h-4 w-4" /><span className="hidden sm:inline">Imóveis{linkedCount != null ? ` (${linkedCount})` : ''}</span>
          </Link>

          <button type="button" onClick={onDelete} className={`${btn} border-transparent text-red-500 hover:bg-red-50 hover:text-red-700`} aria-label="Excluir empreendimento" title="Excluir empreendimento">
            <Trash2 className="h-4 w-4" /><span className="hidden 2xl:inline">Excluir</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => router.push('/admin/empreendimentos')} disabled={saving} className={`${btn} border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50`}>
            <X className="h-4 w-4" /> Cancelar
          </button>
          <button type="button" onClick={() => onSave('DRAFT')} disabled={saving} className={`${btn} border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50`}>
            <Save className="h-4 w-4" /> {published ? 'Salvar como rascunho' : 'Salvar rascunho'}
          </button>
          <button type="button" onClick={() => onSave('PUBLISHED')} disabled={saving} className={`${btn} border-[#1e3a8a] bg-[#1e3a8a] font-medium text-white hover:bg-[#172554] disabled:opacity-50`}>
            <CheckCircle className="h-4 w-4" /> {saving ? 'Salvando…' : saved ? 'Salvo!' : published ? 'Salvar alterações' : 'Salvar e publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
