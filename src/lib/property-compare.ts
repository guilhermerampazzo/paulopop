/**
 * v1.3 — preço/m² do imóvel comparado com a média da região (mesma cidade/bairro, ACTIVE,
 * mesma transação) e do prédio (mesmo empreendimentoId).
 */
import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'

export interface SqmComparison {
  /** preço/m² do imóvel */
  own: number
  /** média da região e quantidade de anúncios considerados (sem o próprio) */
  region: { avg: number; count: number; label: string } | null
  /** média do prédio e quantidade de anúncios (sem o próprio) */
  building: { avg: number; count: number } | null
}

export function sqmOf(price: number | null | undefined, usefulArea: number | null | undefined, totalArea: number | null | undefined): number | null {
  const area = Number(usefulArea ?? totalArea ?? 0)
  const p = Number(price ?? 0)
  if (!(area > 10) || !(p > 1000)) return null
  return p / area
}

async function averageFor(where: Prisma.PropertyWhereInput): Promise<{ avg: number; count: number } | null> {
  const rows = await prisma.property.findMany({ where, select: { price: true, usefulArea: true, totalArea: true }, take: 300 })
  const vals = rows.map(r => sqmOf(Number(r.price), r.usefulArea ? Number(r.usefulArea) : null, r.totalArea ? Number(r.totalArea) : null)).filter((v): v is number => v != null)
  if (!vals.length) return null
  return { avg: vals.reduce((a, b) => a + b, 0) / vals.length, count: vals.length }
}

export async function compareSqm(p: {
  id: string
  price: number | null
  usefulArea: number | null
  totalArea: number | null
  transactionType: string
  city: string | null
  neighborhood: string | null
  empreendimentoId: string | null
}): Promise<SqmComparison | null> {
  const own = sqmOf(p.price, p.usefulArea, p.totalArea)
  if (own == null) return null
  const base: Prisma.PropertyWhereInput = {
    status: 'ACTIVE', hideOnSite: false, id: { not: p.id }, price: { not: null },
    transactionType: p.transactionType as 'SALE' | 'RENT',
  }
  const regionWhere: Prisma.PropertyWhereInput | null = p.neighborhood
    ? { ...base, neighborhood: { equals: p.neighborhood, mode: 'insensitive' } }
    : p.city ? { ...base, city: { equals: p.city, mode: 'insensitive' } } : null
  const [region, building] = await Promise.all([
    regionWhere ? averageFor(regionWhere) : Promise.resolve(null),
    p.empreendimentoId ? averageFor({ ...base, empreendimentoId: p.empreendimentoId }) : Promise.resolve(null),
  ])
  // Sem bairro suficiente (menos de 2 anúncios) tenta a cidade
  let regionOut = region && region.count >= 2 && p.neighborhood ? { ...region, label: p.neighborhood } : null
  if (!regionOut && p.city) {
    const cityAvg = await averageFor({ ...base, city: { equals: p.city, mode: 'insensitive' } })
    if (cityAvg && cityAvg.count >= 2) regionOut = { ...cityAvg, label: p.city.replace(/\s*-\s*DF$/i, '') }
  }
  return { own, region: regionOut, building: building && building.count >= 1 ? building : null }
}

/** "12% abaixo da média" / "5% acima da média" / "na média". */
export function diffLabel(own: number, avg: number): { pct: number; text: string; tone: 'good' | 'bad' | 'neutral' } {
  const pct = Math.round(((own - avg) / avg) * 100)
  if (Math.abs(pct) < 2) return { pct, text: 'na média', tone: 'neutral' }
  return pct < 0 ? { pct, text: `${Math.abs(pct)}% abaixo da média`, tone: 'good' } : { pct, text: `${pct}% acima da média`, tone: 'bad' }
}
