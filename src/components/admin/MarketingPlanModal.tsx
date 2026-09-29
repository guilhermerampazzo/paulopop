'use client'

import { useState } from 'react'
import { X, Megaphone, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  propertyId: string
  propertyTitle: string
  onClose: () => void
}

// Renderizador simples de Markdown — converte títulos, negrito, listas e parágrafos para HTML
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-[#1e3a8a] mt-5 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-[#1e3a8a] mt-6 mb-2 border-b border-gray-100 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-[#1e3a8a] mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-600 text-sm">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-gray-600 text-sm">$2</li>')
    .replace(/\n\n/g, '</p><p class="text-gray-600 text-sm leading-relaxed mt-2">')
    .replace(/^(?!<[h|l])(.+)$/gm, '<p class="text-gray-600 text-sm leading-relaxed">$1</p>')
}

export function MarketingPlanModal({ propertyId, propertyTitle, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai/marketing-plan/${propertyId}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao gerar plano')
      }
      const data = await res.json()
      setPlan(data.plan)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!plan) return
    const blob = new Blob([plan], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plano-marketing-${propertyId}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Plano de Marketing"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 p-5 border-b border-gray-100">
          <div className="w-10 h-10 bg-[#F0F4F8] rounded-xl flex items-center justify-center">
            <Megaphone size={20} className="text-[#2563eb]" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-[#1e3a8a]">Plano de Marketing</h2>
            <p className="text-xs text-gray-400 truncate">{propertyTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5">
          {!plan && !loading && !error && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="w-16 h-16 bg-[#F0F4F8] rounded-2xl flex items-center justify-center">
                <Megaphone size={28} className="text-[#2563eb]" />
              </div>
              <div>
                <p className="font-semibold text-[#1e3a8a] mb-1">Gerar Plano de Marketing com IA</p>
                <p className="text-sm text-gray-400 max-w-sm">
                  Clique no botão abaixo para criar um plano completo com canais, cronograma, orçamento e KPIs.
                </p>
              </div>
              <Button onClick={generate} aria-label="Gerar plano de marketing">
                <Megaphone size={16} />
                Criar Plano de Marketing
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-12 text-gray-500">
              <RefreshCw className="animate-spin text-[#2563eb]" size={28} />
              <p className="text-sm font-medium">Gerando plano de marketing...</p>
              <p className="text-xs text-gray-400">Isso pode levar alguns segundos</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {plan && !loading && (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(plan) }}
            />
          )}
        </div>

        {/* Rodapé */}
        {plan && (
          <div className="p-4 border-t border-gray-100 flex gap-2 justify-end">
            <Button variant="outline" onClick={generate} loading={loading} aria-label="Gerar novo plano">
              <RefreshCw size={14} />
              Regenerar
            </Button>
            <Button onClick={handleDownload} aria-label="Baixar plano como arquivo Markdown">
              <Download size={14} />
              Baixar .md
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
