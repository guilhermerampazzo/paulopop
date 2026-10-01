/**
 * POST /api/admin/mcp/inteligencia
 * Motor de análise de mercado por fatores (v1.5)
 * Analisa um imóvel e retorna insights de mercado
 */

import { NextRequest, NextResponse } from 'next/server'
import { callClaude, extractJSON } from '@/lib/claude-client'
import { MARKET_ANALYSIS_SYSTEM } from '@/lib/market-prompts'
import {
  MarketAnalysisRequest,
  MarketAnalysisResponse,
} from '@/lib/market-types'
import { requireSession } from '@/lib/authz'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const auth = await requireSession()
    if (auth.response) return auth.response

    // 2. Validar e extrair dados
    const body = (await request.json().catch(() => ({}))) as MarketAnalysisRequest

    if (!body.neighborhood || !body.metragem || !body.propertyType) {
      return NextResponse.json(
        {
          error: 'Faltam dados obrigatórios: neighborhood, metragem, propertyType',
        },
        { status: 400 }
      )
    }

    // 3. Construir mensagem para Claude
    const userMessage = `
Analise este imóvel no mercado de ${body.city || 'Brasília'}, especialmente ${body.neighborhood}:

**Dados do Imóvel:**
- Tipo: ${body.propertyType}
- Bairro: ${body.neighborhood}
- Metragem: ${body.metragem}m²
- Quartos: ${body.quartos || 'não informado'}
- Banheiros: ${body.banheiros || 'não informado'}
- Condição: ${body.condicao || 'não informada'}
- Amenidades: ${body.amenidades?.join(', ') || 'nenhuma informada'}
${body.precoAtual ? `- Preço Atual: R$ ${body.precoAtual.toLocaleString('pt-BR')}` : ''}
${body.descricao ? `- Descrição: ${body.descricao}` : ''}

Por favor, forneça uma análise de mercado com os seguintes dados em JSON:
- pricePerM2: preço estimado por m² no mercado
- marketTrend: tendência (alta/estável/queda)
- confidence: confiança de 0-100%
- factors: fatores positivos e negativos
- recommendation: parecer sobre precificação
- analysis: análise detalhada do imóvel

Responda APENAS com JSON válido.
    `

    // 4. Chamar Claude
    console.log(`[Market Analysis] Analisando ${body.propertyType} em ${body.neighborhood}`)

    const claudeResponse = await callClaude(userMessage, MARKET_ANALYSIS_SYSTEM, {
      maxTokens: 2048,
    })

    // 5. Parse da resposta
    const analysis = extractJSON<MarketAnalysisResponse>(claudeResponse)

    // 6. Validar resposta
    if (
      !analysis.pricePerM2 ||
      !analysis.marketTrend ||
      analysis.confidence === undefined
    ) {
      throw new Error('Resposta inválida do Claude: faltam campos obrigatórios')
    }

    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error('[Market Analysis] Erro:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}

// GET para testes/debug (remover em produção)
export async function GET(request: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response

  return NextResponse.json({
    endpoint: '/api/admin/mcp/inteligencia',
    method: 'POST',
    description: 'Motor de análise de mercado por fatores',
    requiresAuth: true,
    examplePayload: {
      propertyType: 'apartamento',
      neighborhood: 'Samambaia',
      city: 'Brasília',
      metragem: 85,
      quartos: 2,
      banheiros: 1,
      condicao: 'bom',
      amenidades: ['portaria', 'piscina'],
      precoAtual: 450000,
    },
  })
}
