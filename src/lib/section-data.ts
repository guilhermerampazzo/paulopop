/**
 * v1.3 — consultas e utilitários usados pelo SectionRenderer (imóveis, empreendimentos, blog)
 * e pelas páginas de cidade (preço médio do m², contagem de imóveis).
 */
import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'
import { isPriceReduced } from './price-history'

// v1.3: youtubeEmbedUrl agora vive em src/lib/youtube.ts (sem Prisma, usável em client components)
export { youtubeEmbedUrl } from './youtube'

/** Link de busca no Google Maps para um endereço. */
export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

/** Filtro Prisma: city OU neighborhood dentro da lista de nomes, sem diferenciar maiúsculas. */
export function cityMatchWhere(names: string[]): Prisma.PropertyWhereInput {
  const list = names.map(n => n.trim()).filter(Boolean)
  if (!list.length) return { id: '__none__' }
  return {
    OR: list.flatMap(n => [
      { city: { equals: n, mode: 'insensitive' as const } },
      { city: { equals: `${n} - DF`, mode: 'insensitive' as const } },
      { neighborhood: { equals: n, mode: 'insensitive' as const } },
    ]),
  }
}

/**
 * v1.3: `select` do Prisma que o PropertyCard precisa (ref, priceHistory e até 5 fotos para o carrossel).
 * Use sempre com `toCard()`.
 */
export const CARD_SELECT = {
  id: true, slug: true, ref: true, title: true, propertyType: true, transactionType: true, status: true,
  price: true, totalArea: true, usefulArea: true, suites: true, balconies: true, bedrooms: true, bathrooms: true,
  environments: true, totalParkingSpots: true, neighborhood: true, city: true, state: true, zipCode: true, createdAt: true,
  daysOnMarket: true, salePrice: true, showSalePrice: true, priceHistory: true,
  images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 5, select: { url: true, thumbnailUrl: true } },
  empreendimento: { select: { stage: true } },
} satisfies Prisma.PropertySelect

type CardRow = Prisma.PropertyGetPayload<{ select: typeof CARD_SELECT }>

export type CardData = ReturnType<typeof toCard>

export function toCard(p: CardRow) {
  // `ref` é reservado pelo React: vira `propertyRef`
  const { ref, priceHistory, images, empreendimento, ...rest } = p
  return {
    ...rest,
    propertyRef: ref,
    price: p.price ? Number(p.price) : null,
    totalArea: p.totalArea ? Number(p.totalArea) : null,
    usefulArea: p.usefulArea ? Number(p.usefulArea) : null,
    salePrice: p.salePrice ? Number(p.salePrice) : null,
    coverImage: images[0]?.thumbnailUrl ?? images[0]?.url ?? null,
    images: images.map(i => i.thumbnailUrl ?? i.url),
    isNew: Date.now() - new Date(p.createdAt).getTime() < 30 * 86400_000,
    priceReduced: isPriceReduced(priceHistory),
    isLaunch: empreendimento?.stage === 'LANCAMENTO',
  }
}

export async function fetchPropertiesForSection(opts: { mode: 'auto' | 'manual'; names: string[]; ids: string[]; transactionType?: 'SALE' | 'RENT' | 'ALL'; limit: number }) {
  const base: Prisma.PropertyWhereInput = { status: 'ACTIVE', hideOnSite: false }
  if (opts.transactionType && opts.transactionType !== 'ALL') base.transactionType = opts.transactionType
  const where: Prisma.PropertyWhereInput = opts.mode === 'manual'
    ? { ...base, id: { in: opts.ids.length ? opts.ids : ['__none__'] } }
    : { ...base, ...cityMatchWhere(opts.names) }
  const rows = await prisma.property.findMany({ where, orderBy: { createdAt: 'desc' }, take: Math.min(24, Math.max(1, opts.limit)), select: CARD_SELECT })
  if (opts.mode === 'manual') {
    const order = new Map(opts.ids.map((id, i) => [id, i]))
    rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  }
  return rows.map(toCard)
}

export async function countActiveProperties(names: string[]): Promise<number> {
  if (!names.length) return 0
  return prisma.property.count({ where: { status: 'ACTIVE', hideOnSite: false, ...cityMatchWhere(names) } })
}

/** Preço médio do m² (venda) dos anúncios ativos da região; null se não houver dados. */
export async function averageSqmPrice(names: string[]): Promise<number | null> {
  if (!names.length) return null
  const rows = await prisma.property.findMany({
    where: { status: 'ACTIVE', hideOnSite: false, transactionType: 'SALE', price: { not: null }, ...cityMatchWhere(names) },
    select: { price: true, usefulArea: true, totalArea: true },
    take: 500,
  })
  const vals = rows.map(r => {
    const area = Number(r.usefulArea ?? r.totalArea ?? 0)
    const price = Number(r.price ?? 0)
    return area > 10 && price > 1000 ? price / area : null
  }).filter((v): v is number => v != null && Number.isFinite(v))
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export interface EmpCard { id: string; slug: string; name: string; stage: string; city: string | null; neighborhood: string | null; coverUrl: string | null }

export async function fetchEmpreendimentosForSection(opts: { mode: 'auto' | 'manual'; names: string[]; ids: string[]; limit: number }): Promise<EmpCard[]> {
  const list = opts.names.map(n => n.trim()).filter(Boolean)
  const where: Prisma.EmpreendimentoWhereInput = opts.mode === 'manual'
    ? { status: 'PUBLISHED', id: { in: opts.ids.length ? opts.ids : ['__none__'] } }
    : { status: 'PUBLISHED', OR: list.length ? list.flatMap(n => [{ city: { equals: n, mode: 'insensitive' as const } }, { neighborhood: { equals: n, mode: 'insensitive' as const } }]) : [{ id: '__none__' }] }
  const rows = await prisma.empreendimento.findMany({
    where, take: Math.min(24, Math.max(1, opts.limit)), orderBy: { createdAt: 'desc' },
    select: { id: true, slug: true, name: true, stage: true, city: true, neighborhood: true, coverUrl: true, images: { where: { category: 'FACHADA' }, take: 1, orderBy: { order: 'asc' }, select: { url: true } } },
  })
  return rows.map(r => ({ id: r.id, slug: r.slug, name: r.name, stage: r.stage, city: r.city, neighborhood: r.neighborhood, coverUrl: r.coverUrl ?? r.images[0]?.url ?? null }))
}

export async function fetchEmpreendimentosByIds(ids: string[]): Promise<EmpCard[]> {
  if (!ids.length) return []
  return fetchEmpreendimentosForSection({ mode: 'manual', names: [], ids, limit: ids.length })
}

export interface BlogCard { id: string; slug: string; title: string; excerpt: string | null; coverUrl: string | null; publishedAt: Date | null; readingMinutes: number | null }

export async function fetchBlogForSection(opts: { citySlug?: string; tag?: string; limit: number }): Promise<BlogCard[]> {
  const where: Prisma.BlogPostWhereInput = { status: 'PUBLISHED', publishedAt: { lte: new Date() } }
  if (opts.citySlug) where.citySlug = opts.citySlug
  if (opts.tag) where.tags = { has: opts.tag }
  if (!opts.citySlug && !opts.tag) return []
  return prisma.blogPost.findMany({
    where, orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }], take: Math.min(12, Math.max(1, opts.limit)),
    select: { id: true, slug: true, title: true, excerpt: true, coverUrl: true, publishedAt: true, readingMinutes: true },
  })
}
