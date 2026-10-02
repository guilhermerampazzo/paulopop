/**
 * v1.5 — Pinos do mapa da busca (/imoveis?modo=mapa).
 * Quando o anúncio não mostra o endereço completo, o pino fica na posição aproximada
 * (coordenada arredondada a 3 casas ≈ 110 m), para não expor o endereço exato.
 */
export interface MapPin {
  id: string
  slug: string
  lat: number
  lng: number
  approx: boolean
  price: number | null
  hidePrice: boolean
  title: string
  type: string | null
  transaction: 'SALE' | 'RENT'
  bedrooms: number | null
  area: number | null
  neighborhood: string | null
  cover: string | null
}

export interface PinSource {
  id: string
  slug: string
  latitude: unknown
  longitude: unknown
  showFullAddress: boolean
  price: unknown
  hidePrice: boolean
  title: string | null
  propertyType: string | null
  transactionType: string
  bedrooms: number | null
  usefulArea: unknown
  totalArea: unknown
  neighborhood: string | null
  city: string | null
  images: { url: string; thumbnailUrl: string | null }[]
}

const n = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

export function toMapPin(p: PinSource): MapPin | null {
  let lat = n(p.latitude)
  let lng = n(p.longitude)
  if (lat === null || lng === null || (lat === 0 && lng === 0)) return null
  const approx = !p.showFullAddress
  if (approx) {
    lat = Math.round(lat * 1000) / 1000
    lng = Math.round(lng * 1000) / 1000
  }
  const area = n(p.usefulArea) ?? n(p.totalArea)
  return {
    id: p.id,
    slug: p.slug,
    lat,
    lng,
    approx,
    price: p.hidePrice ? null : n(p.price),
    hidePrice: p.hidePrice,
    title: p.title || [p.propertyType, p.neighborhood || p.city].filter(Boolean).join(' em ') || 'Imóvel',
    type: p.propertyType,
    transaction: p.transactionType === 'RENT' ? 'RENT' : 'SALE',
    bedrooms: p.bedrooms ?? null,
    area,
    neighborhood: p.neighborhood || p.city,
    cover: p.images[0]?.thumbnailUrl ?? p.images[0]?.url ?? null,
  }
}

/** "R$ 320 mil", "R$ 1,25 mi", "R$ 2.500" (aluguel) — rótulo curto do pino. */
export function shortPrice(price: number | null, transaction: 'SALE' | 'RENT'): string {
  if (price === null || price <= 0) return 'Consulte'
  if (transaction === 'RENT' || price < 10_000) return `R$ ${Math.round(price).toLocaleString('pt-BR')}`
  if (price < 1_000_000) return `R$ ${Math.round(price / 1000).toLocaleString('pt-BR')} mil`
  const mi = Math.round(price / 10_000) / 100
  return `R$ ${mi.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`
}
