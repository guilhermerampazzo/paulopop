/**
 * POST /api/admin/mcp/parecer-a4
 * Gera relatório de avaliação em formato A4 (Parecer)
 * Retorna markdown pronto para conversão em PDF
 */

import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/claude-client'
import { REPORT_GENERATION_SYSTEM } from '@/lib/market-prompts'
import { MarketStudyReportInput } from '@/lib/market-types'
import { requireSession } from '@/lib/authz'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const auth = await requireSession()
    if (auth.response) return auth.response

    // 2. Validar dados
    const body = (await request.json().catch(() => ({}))) as MarketStudyReportInput

    if (!body.propertyData || !body.analysis || !body.brokerInfo) {
      return NextResponse.json(
        {
          error:
            'Faltam dados obrigatórios: propertyData, analysis, brokerInfo',
        },
        { status: 400 }
      )
    }

    if (
      !body.analysis.pricePerM2 ||
      !body.analysis.factors?.positive ||
      !body.analysis.factors?.negative
    ) {
      return NextResponse.json(
        { error: 'analysis incompleta: faltam pricePerM2 ou factors' },
        { status: 400 }
      )
    }

    // 3. Construir contexto para o relatório
    console.log('[Parecer A4] Gerando relatório para', body.propertyData.neighborhood)

    const comparablesList = (body.comparables ?? [])
      .map(
        (c) => `
- **${c.title}**
  - Endereço: ${c.neighborhood}, ${c.city}
  - Tipo: ${c.propertyType} | ${c.metragem}m² | ${c.quartos}Q | ${c.banheiros}B
  - Preço Total: R$ ${c.precoTotal.toLocaleString('pt-BR')}
  - Preço/m²: R$ ${c.precoPerM2.toLocaleString('pt-BR')}
  - Condição: ${c.condicao}
  - Fonte: ${c.fonteFonte} ([Link](${c.linkFonte}))
`
      )
      .join('\n')

    const userMessage = `
Gere um parecer técnico profissional de avaliação imobiliária.

**IMÓVEL AVALIADO:**
- Tipo: ${body.propertyData.propertyType}
- Endereço: ${body.propertyData.neighborhood}, ${body.propertyData.city}
- Metragem: ${body.propertyData.metragem}m²
- Composição: ${body.propertyData.quartos}Q | ${body.propertyData.banheiros}B
- Condição: ${body.propertyData.condicao}
- Amenidades: ${body.propertyData.amenidades?.join(', ') || 'nenhuma'}
${body.propertyData.precoAtual ? `- Preço Informado: R$ ${body.propertyData.precoAtual.toLocaleString('pt-BR')}` : ''}

**ANÁLISE DE MERCADO:**
- Preço por m² (mercado): R$ ${body.analysis.pricePerM2.toLocaleString('pt-BR')}
- Tendência: ${body.analysis.marketTrend}
- Confiança: ${body.analysis.confidence}%
- Fatores Positivos: ${body.analysis.factors.positive.join('; ')}
- Fatores Negativos: ${body.analysis.factors.negative.join('; ')}
- Análise: ${body.analysis.analysis}

**IMÓVEIS COMPARÁVEIS UTILIZADOS:**
${comparablesList}

**INFORMAÇÕES DO AVALIADOR:**
- Nome: ${body.brokerInfo.name}
- CRECI: ${body.brokerInfo.creci}
- Telefone: ${body.brokerInfo.phone}
${body.brokerInfo.email ? `- Email: ${body.brokerInfo.email}` : ''}
- Data: ${new Date().toLocaleDateString('pt-BR')}

Gere um parecer profissional em MARKDOWN estruturado que:
1. Apresente a propriedade de forma clara
2. Documente o método de avaliação
3. Justifique os comparáveis escolhidos
4. Detalhe a análise de mercado
5. Conclua com parecer de valor (em R$)

O parecer deve ser conciso mas completo, pronto para impressão A4.
Inclua tabelas para dados estruturados quando apropriado.

Responda APENAS com Markdown válido, sem JSON, sem explicações extras.
    `

    // 4. Chamar Claude para gerar relatório
    const markdownReport = await callClaude(userMessage, REPORT_GENERATION_SYSTEM, {
      maxTokens: 3000,
    })

    // 5. Validar que recebemos markdown
    if (!markdownReport || markdownReport.trim().length < 100) {
      throw new Error('Relatório gerado está vazio ou muito curto')
    }

    // 6. Preparar resposta
    const response = {
      success: true,
      data: {
        markdown: markdownReport,
        propertyId: body.propertyId,
        generatedAt: new Date(),
        estimatedPages: Math.ceil(markdownReport.length / 3000),
        instructions:
          'Converta este markdown para PDF usando ferramentas como markdown-pdf, pandoc ou similares',
      },
    }

    console.log(`[Parecer A4] Relatório gerado com sucesso`)

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Parecer A4] Erro:', error)

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

// GET para debug
export async function GET(request: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response

  return NextResponse.json({
    endpoint: '/api/admin/mcp/parecer-a4',
    method: 'POST',
    description: 'Geração de parecer técnico de avaliação em formato A4',
    requires_auth: true,
    returns: 'Markdown pronto para PDF',
    example_response: {
      success: true,
      data: {
        markdown: '# Parecer de Avaliação...',
        propertyId: 'prop-123',
        generatedAt: '2026-10-01T10:00:00Z',
        estimatedPages: 3,
      },
    },
  })
}
