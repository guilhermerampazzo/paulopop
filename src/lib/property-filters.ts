/**
 * v1.5 — Filtros da busca pública de imóveis (/imoveis), compartilhados pela lista e pelo mapa
 * (/api/imoveis/mapa), para os dois mostrarem exatamente os mesmos imóveis.
 * Extraído de src/app/imoveis/page.tsx (v1.3); novo filtro `area` (retângulo do mapa).
 */
import type { Prisma } from '@prisma/client'
import { searchTextWhere, normalizeSearchText } from '@/lib/property-search'

export interface SearchParams {
  q?: string
  /** v1.3: busca por texto único (ref, título, bairro, cidade, endereço, empreendimento) */
  busca?: string
  transacao?: string
  finalidade?: string
  tipo?: string
  precoMin?: string
  precoMax?: string
  quartos?: string
  banheiros?: string
  areaMin?: string
  estado?: string
  cidade?: string
  bairro?: string
  feature?: string | string[]
  ordem?: string
  pagina?: string
  /** v1.5: retângulo do mapa "sul,oeste,norte,leste" (graus decimais) */
  area?: string
  /** v1.5: "mapa" mostra o mapa acima da lista */
  modo?: string
}

export interface MapBounds { south: number; west: number; north: number; east: number }

/** "sul,oeste,norte,leste" → limites válidos (ou null). */
export function parseArea(area: string | null | undefined): MapBounds | null {
  const raw = String(area ?? '').trim()
  if (!raw) return null
  const parts = raw.split(',').map(v => Number(v))
  if (parts.length !== 4 || parts.some(v => !Number.isFinite(v))) return null
  const [south, west, north, east] = parts
  if (south < -90 || north > 90 || west < -180 || east > 180 || south >= north || west >= east) return null
  return { south, west, north, east }
}

/** Limites → "sul,oeste,norte,leste" com 5 casas (≈1 m). */
export function formatArea(b: MapBounds): string {
  const r = (v: number) => Math.round(v * 1e5) / 1e5
  return [b.south, b.west, b.north, b.east].map(r).join(',')
}

export function searchText(sp: SearchParams): string {
  return normalizeSearchText(sp.busca ?? sp.q)
}

export function buildWhere(sp: SearchParams): Prisma.PropertyWhereInput {
  const features = Array.isArray(sp.feature)
    ? sp.feature
    : sp.feature
      ? [sp.feature]
      : []
  const bounds = parseArea(sp.area)

  return {
    status: 'ACTIVE',
    hideOnSite: false,
    ...(sp.transacao === 'alugar' ? { transactionType: 'RENT' } : sp.transacao === 'comprar' ? { transactionType: 'SALE' } : {}),
    ...(sp.finalidade === 'residencial' ? { purpose: 'RESIDENTIAL' } : sp.finalidade === 'comercial' ? { purpose: 'COMMERCIAL' } : {}),
    ...(sp.tipo ? { propertyType: { equals: sp.tipo, mode: 'insensitive' as const } } : {}),
    ...(sp.precoMin || sp.precoMax ? {
      price: {
        ...(sp.precoMin ? { gte: parseFloat(sp.precoMin) } : {}),
        ...(sp.precoMax ? { lte: parseFloat(sp.precoMax) } : {}),
      }
    } : {}),
    ...(sp.quartos ? {
      bedrooms: sp.quartos === '4' ? { gte: 4 } : { equals: parseInt(sp.quartos) }
    } : {}),
    ...(sp.banheiros ? {
      bathrooms: sp.banheiros === '4' ? { gte: 4 } : { equals: parseInt(sp.banheiros) }
    } : {}),
    ...(sp.areaMin ? { totalArea: { gte: parseFloat(sp.areaMin) } } : {}),
    ...(sp.estado ? { state: { equals: sp.estado, mode: 'insensitive' as const } } : {}),
    ...(sp.cidade ? { city: { contains: sp.cidade, mode: 'insensitive' as const } } : {}),
    ...(sp.bairro ? { neighborhood: { contains: sp.bairro, mode: 'insensitive' as const } } : {}),
    // v1.3: `busca` (ou `q`, legado) procura em ref, título, bairro, cidade, endereço, bairro comercial e empreendimento
    ...(searchText(sp) ? { OR: searchTextWhere(searchText(sp)) } : {}),
    // v1.5: só imóveis dentro do retângulo do mapa ("Buscar nesta área")
    ...(bounds ? { latitude: { gte: bounds.south, lte: bounds.north }, longitude: { gte: bounds.west, lte: bounds.east } } : {}),
    ...(features.length > 0 ? {
      features: { some: { feature: { in: features as never[] } } }
    } : {}),
  }
}
