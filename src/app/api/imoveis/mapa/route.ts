export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildWhere, type SearchParams } from '@/lib/property-filters'
import { toMapPin, type MapPin } from '@/lib/map-pins'

const MAX_PINS = 500

/**
 * v1.5 — GET /api/imoveis/mapa?<mesmos filtros de /imoveis>
 * Pinos dos imóveis publicados que batem com a busca (até 500), para o mapa da busca.
 * Imóvel sem endereço completo liberado → posição aproximada (veja map-pins.ts).
 */
export async function GET(req: NextRequest) {
  const sp: SearchParams = {}
  const qs = req.nextUrl.searchParams
  for (const key of ['q', 'busca', 'transacao', 'finalidade', 'tipo', 'precoMin', 'precoMax', 'quartos', 'banheiros', 'areaMin', 'estado', 'cidade', 'bairro', 'area'] as const) {
    const v = qs.get(key)
    if (v) (sp as Record<string, string>)[key] = v.slice(0, 200)
  }
  const features = qs.getAll('feature').slice(0, 20)
  if (features.length) sp.feature = features

  const where = buildWhere(sp)
  const [rows, total] = await Promise.all([
    prisma.property.findMany({
      where: { AND: [where, { latitude: { not: null } }, { longitude: { not: null } }] },
      take: MAX_PINS,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, slug: true, latitude: true, longitude: true, showFullAddress: true,
        price: true, hidePrice: true, title: true, propertyType: true, transactionType: true,
        bedrooms: true, usefulArea: true, totalArea: true, neighborhood: true, city: true,
        images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 1, select: { url: true, thumbnailUrl: true } },
      },
    }),
    prisma.property.count({ where }),
  ])
  const pins = rows.map(toMapPin).filter((p): p is MapPin => p !== null)
  return NextResponse.json(
    { pins, total, withoutLocation: Math.max(0, total - pins.length), capped: rows.length >= MAX_PINS },
    { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' } },
  )
}
