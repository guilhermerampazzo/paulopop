/**
 * Componente: Botão "Buscar Amostras" para o painel admin (v1.5)
 * Usa POST /api/admin/mcp/buscar-amostras e devolve as amostras no callback.
 */

'use client'

import React, { useState } from 'react'
import {
  MarketAnalysisRequest,
  BuscaAmostrasResponse,
} from '@/lib/market-types'

interface BuscaAmostrasButtonProps {
  propertyId?: string
  propertyData: MarketAnalysisRequest
  onSamplesFound: (response: BuscaAmostrasResponse) => void
  isLoading?: boolean
}

export function BuscaAmostrasButton({
  propertyId,
  propertyData,
  onSamplesFound,
  isLoading: parentIsLoading = false,
}: BuscaAmostrasButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')

  const handleClick = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setProgress('Iniciando busca de amostras...')

    try {
      setProgress('Enviando dados para análise...')

      const response = await fetch('/api/admin/mcp/buscar-amostras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId,
          propertyData,
          maxResults: 10,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Erro HTTP ${response.status}`)
      }

      setProgress('Processando resultados...')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar amostras')
      }

      setProgress(
        `Busca concluída: ${data.data.totalEncontradas} amostras encontradas`
      )
      setSuccess(
        `${data.data.totalEncontradas} amostras encontradas com sucesso!`
      )

      // Chamar callback com os resultados
      onSamplesFound(data.data)

      // Limpar progresso após 3 segundos
      setTimeout(() => setProgress(''), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
      console.error('[BuscaAmostrasButton] Erro:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const isDisabled = parentIsLoading || isLoading

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          w-full px-4 py-2.5 rounded-lg font-medium
          transition-colors duration-200
          ${
            isDisabled
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white active:bg-blue-800'
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 2v20m10-10H2"
              />
            </svg>
            Buscando amostras...
          </span>
        ) : (
          'Buscar Amostras'
        )}
      </button>

      {progress && (
        <div className="text-sm text-gray-600 text-center italic">
          {progress}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">Erro:</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-medium">Sucesso!</p>
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <p className="text-xs text-gray-500">
        💡 O sistema buscará amostras em ordem de prioridade:
        <br />
        1. Seu portfólio (corretorpaulopop.com)
        <br />
        2. Quadras adjacentes
        <br />
        3. Portais (WImóveis, DF Imóveis, OLX)
      </p>
    </div>
  )
}

export default BuscaAmostrasButton
