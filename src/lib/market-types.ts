/**
 * Tipos para análise de mercado imobiliário
 */

export interface MarketAnalysisRequest {
  propertyType: string
  neighborhood: string
  city: string
  metragem: number
  quartos: number
  banheiros: number
  condicao: string
  amenidades: string[]
  precoAtual?: number
  descricao?: string
}

export interface MarketAnalysisResponse {
  pricePerM2: number
  marketTrend: 'alta' | 'estável' | 'queda'
  confidence: number
  factors: {
    positive: string[]
    negative: string[]
  }
  recommendation: string
  analysis: string
}

export interface PropertySearchCriteria {
  propertyType: string[]
  location: {
    city: string
    neighborhoods: string[]
    radius: number
  }
  size: {
    min: number
    max: number
  }
  rooms?: {
    bedrooms: number
    bathrooms: number
  }
  condition: string
  amenities: string[]
  priority: string[]
}

export interface ComparableProperty {
  id: string
  title: string
  propertyType: string
  neighborhood: string
  city: string
  metragem: number
  quartos: number
  banheiros: number
  precoTotal: number
  precoPerM2: number
  condicao: string
  linkFonte: string
  fonteFonte: 'corretorpaulopop' | 'wimoveis' | 'dfimoveis' | 'olx' | 'outro'
  dataCadastro: Date
  fotos?: string[]
}

export interface MarketStudyReportInput {
  propertyId: string
  propertyData: MarketAnalysisRequest
  analysis: MarketAnalysisResponse
  comparables: ComparableProperty[]
  brokerInfo: {
    name: string
    creci: string
    phone: string
    email?: string
  }
}

export interface SampleSearchRequest {
  propertyId: string
  propertyData: MarketAnalysisRequest
  maxResults?: number
  priorityPortals?: string[]
}

export interface SampleSearchResponse {
  total: number
  samples: ComparableProperty[]
  sources: {
    [key: string]: number
  }
  searchedAt: Date
}

export interface BuscaAmostrasResponse {
  propertyId: string
  status: 'iniciado' | 'processando' | 'concluido' | 'erro'
  totalEncontradas: number
  amostras: ComparableProperty[]
  fontes: {
    corretorpaulopop: number
    wimoveis: number
    dfimoveis: number
    olx: number
    quadrasAdjacentes: number
  }
  iniciadoEm: Date
  concluidoEm?: Date
  erro?: string
}
