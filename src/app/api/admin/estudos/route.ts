export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, isAdmin } from '@/lib/authz'
import { DEFAULT_INTRO, DEFAULT_METHODOLOGY } from '@/lib/market-study'
import { stripHtml, limitString } from '@/lib/sanitize'

/** v1.2 — Estudos de mercado: lista (GET) e cria (POST, opcionalmente a partir de um imóvel cadastrado). */
export async function GET(request: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const q = request.nextUrl.searchParams.get('q')?.trim()
  const where = {
    ...(isAdmin(auth.user) ? {} : { agentId: auth.user.id }),
    ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' as const } }, { preparedFor: { contains: q, mode: 'insensitive' as const } }, { address: { contains: q, mode: 'insensitive' as const } }] } : {}),
  }
  const items = await prisma.marketStudy.findMany({
    where, orderBy: { updatedAt: 'desc' }, take: 200,
    select: { id: true, title: true, preparedFor: true, status: true, studyDate: true, updatedAt: true, city: true, neighborhood: true, results: true, publicToken: true, agent: { select: { name: true } }, _count: { select: { samples: true } } },
  })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const body = await request.json().catch(() => ({})) as { propertyId?: string; title?: string; preparedFor?: string }

  let fromProperty: Record<string, unknown> = {}
  if (body.propertyId) {
    const p = await prisma.property.findUnique({
      where: { id: body.propertyId },
      include: { images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 12, select: { url: true } }, owner: { select: { name: true, email: true, phone: true } }, empreendimento: { select: { name: true } }, parkingSpots: true },
    })
    if (p) {
      const parking = p.totalParkingSpots ?? p.parkingSpots.reduce((a, s) => a + (s.quantity ?? 0), 0)
      fromProperty = {
        propertyId: p.id,
        title: p.title ?? `${p.propertyType ?? 'Imóvel'} ${p.ref}`,
        preparedFor: p.owner?.name ?? p.ownerName ?? null,
        ownerEmail: p.owner?.email ?? null,
        ownerPhone: p.owner?.phone ?? null,
        advertiser: p.owner?.name ? `Proprietário – ${p.owner.name}` : null,
        address: [p.address, p.number, p.complement, p.empreendimento?.name].filter(Boolean).join(', ') || null,
        neighborhood: p.neighborhood, city: p.city, state: p.state, zipCode: p.zipCode,
        latitude: p.latitude, longitude: p.longitude,
        propertyType: p.propertyType, purpose: p.purpose, transactionType: p.transactionType,
        areaPrivate: p.usefulArea, areaTotal: p.totalArea,
        bedrooms: p.bedrooms, suites: p.suites, bathrooms: p.bathrooms, parking: parking || null,
        floor: p.floor, buildingFloors: p.buildingFloors,
        condition: p.condition, age: p.constructionYear ? new Date().getFullYear() - p.constructionYear : null,
        condoFee: p.condominiumFee, iptu: p.iptu,
        photos: p.images.map(i => i.url),
      }
    }
  }

  const study = await prisma.marketStudy.create({
    data: {
      agentId: auth.user.id,
      title: limitString(stripHtml(String(body.title ?? fromProperty.title ?? 'Novo estudo de mercado')), 200),
      preparedFor: body.preparedFor ? limitString(stripHtml(body.preparedFor), 150) : (fromProperty.preparedFor as string | null) ?? null,
      intro: DEFAULT_INTRO,
      methodology: DEFAULT_METHODOLOGY,
      radiusKm: 2,
      ...Object.fromEntries(Object.entries(fromProperty).filter(([k]) => !['title', 'preparedFor'].includes(k))),
    } as never,
    select: { id: true },
  })
  return NextResponse.json(study, { status: 201 })
}
