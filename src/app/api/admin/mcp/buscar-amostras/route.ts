/**
 * POST /api/admin/mcp/buscar-amostras
 * Busca imóveis comparáveis usando Claude para definir critérios
 * Prioridade: corretorpaulopop.com → quadras → portais
 */

import { NextRequest, NextResponse } from 'next/server'
import { callClaude, extractJSON } from '@/lib/claude-client'
import { COMPARABLE_SEARCH_SYSTEM } from '@/lib/market-prompts'
import {
  MarketAnalysisRequest,
  PropertySearchCriteria,
  ComparableProperty,
  BuscaAmostrasResponse,
} from '@/lib/market-types'
import { requireSession } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Prisma Decimal chega como objeto — converte com segurança para number. */
function num(v: unknown): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const asDecimal = v as { toNumber?: unknown }
  if (typeof asDecimal.toNumber === 'function') {
    try {
      return (asDecimal.toNumber as () => number)()
    } catch {
      return 0
    }
  }
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Base pública do site para montar o link da amostra. */
function siteBase(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://corretorpaulopop.com'
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const auth = await requireSession()
    if (auth.response) return auth.response

    // 2. Validar dados
    const body = (await request.json().catch(() => ({}))) as {
      propertyId?: string
      propertyData: MarketAnalysisRequest
      maxResults?: number
    }

    if (!body.propertyData) {
      return NextResponse.json(
        { error: 'Faltam dados: propertyData' },
        { status: 400 }
      )
    }

    const maxResults = body.maxResults || 10
    const MIN_SAMPLES = Math.ceil(maxResults * 0.6)

    // 3. Usar Claude para definir critérios de busca
    console.log('[Busca Amostras] Definindo critérios com Claude...')

    const userMessage = `
Analise este imóvel e sugira critérios de busca para encontrar comparáveis no mercado:

Tipo: ${body.propertyData.propertyType}
Bairro: ${body.propertyData.neighborhood}
Cidade: ${body.propertyData.city}
Metragem: ${body.propertyData.metragem}m²
Quartos: ${body.propertyData.quartos}
Banheiros: ${body.propertyData.banheiros}
Condição: ${body.propertyData.condicao}
Amenidades: ${body.propertyData.amenidades?.join(', ') || 'nenhuma'}

Retorne um JSON com critérios de busca para encontrar imóveis semelhantes:
{
  "propertyType": [...],
  "location": {"city": "...", "neighborhoods": [...], "radius": ...},
  "size": {"min": ..., "max": ...},
  "rooms": {"bedrooms": ..., "bathrooms": ...},
  "condition": "...",
  "amenities": [...],
  "priority": [...]
}

Responda APENAS com JSON válido.
    `

    const claudeResponse = await callClaude(
      userMessage,
      COMPARABLE_SEARCH_SYSTEM,
      { maxTokens: 1024 }
    )

    const searchCriteria = extractJSON<PropertySearchCriteria>(claudeResponse)

    // 4. Buscar amostras em ordem de prioridade
    const allSamples: ComparableProperty[] = []

    // A. Buscar em corretorpaulopop.com PRIMEIRO
    console.log('[Busca Amostras] Procurando no portfólio corretorpaulopop.com...')
    const ownPortfolio = await searchOwnPortfolio(
      searchCriteria,
      body.propertyId,
      maxResults
    )
    allSamples.push(...ownPortfolio)

    // B. Se não encontrou amostras suficientes, buscar em quadras adjacentes
    if (allSamples.length < MIN_SAMPLES) {
      console.log('[Busca Amostras] Expandindo para quadras adjacentes...')
      const adjacentQuads = await searchAdjacentQuads(
        searchCriteria,
        maxResults - allSamples.length
      )
      allSamples.push(...adjacentQuads)
    }

    // C. Se ainda faltarem, buscar em portais
    if (allSamples.length < MIN_SAMPLES) {
      console.log('[Busca Amostras] Buscando em portais...')
      const portalResults = await searchPortals(
        searchCriteria,
        maxResults - allSamples.length
      )
      allSamples.push(...portalResults)
    }

    // 5. Limitar e retornar
    const finalSamples = allSamples.slice(0, maxResults)

    const response: BuscaAmostrasResponse = {
      propertyId: body.propertyId || 'new',
      status: 'concluido',
      totalEncontradas: finalSamples.length,
      amostras: finalSamples,
      fontes: {
        corretorpaulopop: ownPortfolio.length,
        wimoveis: allSamples.filter((s) => s.fonteFonte === 'wimoveis').length,
        dfimoveis: allSamples.filter((s) => s.fonteFonte === 'dfimoveis').length,
        olx: allSamples.filter((s) => s.fonteFonte === 'olx').length,
        quadrasAdjacentes: allSamples.filter(
          (s) => s.fonteFonte === 'outro'
        ).length,
      },
      iniciadoEm: new Date(),
      concluidoEm: new Date(),
    }

    console.log(`[Busca Amostras] Concluído: ${finalSamples.length} amostras`)

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error('[Busca Amostras] Erro:', error)

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

/**
 * Buscar no portfólio próprio do corretorpaulopop.com
 */
async function searchOwnPortfolio(
  criteria: PropertySearchCriteria,
  excludePropertyId?: string,
  limit: number = 10
): Promise<ComparableProperty[]> {
  try {
    const sizeMin = criteria.size?.min ?? 0
    const sizeMax = criteria.size?.max ?? 999999

    // Buscar imóveis do próprio corretor que correspondem aos critérios
    const properties = await prisma.property.findMany({
      where: {
        AND: [
          // Convenção do projeto: visível no site = ACTIVE + não oculto
          { status: 'ACTIVE', hideOnSite: false },
          excludePropertyId ? { id: { not: excludePropertyId } } : {},
          ...(criteria.propertyType?.length
            ? [{ propertyType: { in: criteria.propertyType } }]
            : []),
          ...(criteria.location?.neighborhoods?.length
            ? [{ neighborhood: { in: criteria.location.neighborhoods } }]
            : []),
          { usefulArea: { gte: sizeMin, lte: sizeMax } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        images: { take: 3, select: { url: true } },
      },
    })

    return properties.map((p) => {
      const price = num(p.price)
      const area = num(p.usefulArea)
      return {
        id: p.id,
        title: p.title || `${p.propertyType} ${p.ref}`,
        propertyType: p.propertyType || '',
        neighborhood: p.neighborhood || '',
        city: p.city || '',
        metragem: area,
        quartos: p.bedrooms || 0,
        banheiros: p.bathrooms || 0,
        precoTotal: price,
        precoPerM2: area && price ? Math.round(price / area) : 0,
        condicao: p.condition || 'não informada',
        linkFonte: `${siteBase()}/imoveis/${p.slug}`,
        fonteFonte: 'corretorpaulopop',
        dataCadastro: p.createdAt,
        fotos: p.images.map((img) => img.url),
      } satisfies ComparableProperty
    })
  } catch (error) {
    console.warn('[searchOwnPortfolio] Erro:', error)
    return []
  }
}

/**
 * Buscar em quadras adjacentes (implementação básica)
 */
async function searchAdjacentQuads(
  criteria: PropertySearchCriteria,
  limit: number = 5
): Promise<ComparableProperty[]> {
  try {
    // Buscar em toda a região/cidade, não apenas o bairro específico
    const properties = await prisma.property.findMany({
      where: {
        AND: [
          { status: 'ACTIVE', hideOnSite: false },
          { city: criteria.location.city },
          ...(criteria.propertyType?.length
            ? [{ propertyType: { in: criteria.propertyType } }]
            : []),
          {
            usefulArea: {
              gte: criteria.size?.min ?? 0,
              lte: criteria.size?.max ?? 999999,
            },
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    return properties.map((p) => {
      const price = num(p.price)
      const area = num(p.usefulArea)
      return {
        id: p.id,
        title: p.title || `${p.propertyType} ${p.ref}`,
        propertyType: p.propertyType || '',
        neighborhood: p.neighborhood || '',
        city: p.city || '',
        metragem: area,
        quartos: p.bedrooms || 0,
        banheiros: p.bathrooms || 0,
        precoTotal: price,
        precoPerM2: area && price ? Math.round(price / area) : 0,
        condicao: p.condition || 'não informada',
        linkFonte: `${siteBase()}/imoveis/${p.slug}`,
        fonteFonte: 'outro',
        dataCadastro: p.createdAt,
      } satisfies ComparableProperty
    })
  } catch (error) {
    console.warn('[searchAdjacentQuads] Erro:', error)
    return []
  }
}

/**
 * Buscar em portais externos (placeholder)
 * TODO: Implementar integrações reais com WImóveis, DF Imóveis, OLX
 */
async function searchPortals(
  criteria: PropertySearchCriteria,
  limit: number = 5
): Promise<ComparableProperty[]> {
  // Implementar chamadas para APIs de portais
  // Por enquanto, retornar array vazio
  console.log('[searchPortals] Implementação pendente de integrações reais')
  return []
}

// GET para debug
export async function GET(request: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response

  return NextResponse.json({
    endpoint: '/api/admin/mcp/buscar-amostras',
    method: 'POST',
    description: 'Busca de imóveis comparáveis com priorização inteligente',
    requires_auth: true,
    prioridade: [
      '1. corretorpaulopop.com',
      '2. Quadras adjacentes',
      '3. Portais (WImóveis, DF Imóveis, OLX)',
    ],
  })
}
