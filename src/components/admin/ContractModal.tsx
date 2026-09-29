'use client'

import { useState } from 'react'
import { X, FileText, Printer, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  propertyId: string
  propertyTitle: string
  onClose: () => void
}

export function ContractModal({ propertyId, propertyTitle, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai/contrato/${propertyId}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao gerar contrato')
      }
      const data = await res.json()
      setHtml(data.html)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (!html) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Contrato — ${propertyTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; line-height: 1.6; }
          h1, h2, h3 { color: #1e3a8a; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          td, th { border: 1px solid #ccc; padding: 8px; font-size: 13px; }
          p { margin: 8px 0; font-size: 14px; }
          ol { padding-left: 20px; }
          li { margin-bottom: 6px; font-size: 14px; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Geração de Contrato">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-gray-100">
          <div className="w-10 h-10 bg-[#F0F4F8] rounded-xl flex items-center justify-center">
            <FileText size={20} className="text-[#2563eb]" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-[#1e3a8a]">Contrato de Representação</h2>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {!html && !loading && !error && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="w-16 h-16 bg-[#F0F4F8] rounded-2xl flex items-center justify-center">
                <FileText size={28} className="text-[#2563eb]" />
              </div>
              <div>
                <p className="font-semibold text-[#1e3a8a] mb-1">Gerar Contrato de Representação</p>
                <p className="text-sm text-gray-400 max-w-sm">
                  Gera um contrato juridicamente fundamentado com base nos dados do imóvel, proprietário e corretor.
                </p>
              </div>
              <Button onClick={generate} aria-label="Gerar contrato">
                <FileText size={16} />
                Criar Contrato
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-12 text-gray-500">
              <RefreshCw className="animate-spin text-[#2563eb]" size={28} />
              <p className="text-sm font-medium">Gerando contrato...</p>
              <p className="text-xs text-gray-400">Isso pode levar alguns segundos</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {html && !loading && (
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <div
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {html && (
          <div className="p-4 border-t border-gray-100 flex gap-2 justify-end">
            <Button variant="outline" onClick={generate} loading={loading} aria-label="Gerar novo contrato">
              <RefreshCw size={14} />
              Regenerar
            </Button>
            <Button onClick={handlePrint} aria-label="Imprimir contrato">
              <Printer size={14} />
              Imprimir / PDF
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
