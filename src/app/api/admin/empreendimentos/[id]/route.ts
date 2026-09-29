export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidateSite } from '@/lib/cache'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const item = await prisma.empreendimento.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: 'asc' } },
      floorPlanImages: { orderBy: { order: 'asc' } },
    },
  })
  if (!item) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  const item = await prisma.empreendimento.update({
    where: { id },
    data: {
      name:         body.name         ? String(body.name)         : undefined,
      tagline:      body.tagline      !== undefined ? (body.tagline ? String(body.tagline) : null) : undefined,
      description:  body.description  !== undefined ? (body.description ? String(body.description) : null) : undefined,
      status:       body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      address:      body.address      !== undefined ? (body.address ? String(body.address) : null) : undefined,
      neighborhood: body.neighborhood !== undefined ? (body.neighborhood ? String(body.neighborhood) : null) : undefined,
      city:         body.city         !== undefined ? (body.city ? String(body.city) : null) : undefined,
      state:        body.state        !== undefined ? (body.state ? String(body.state) : null) : undefined,
      latitude:     body.latitude     !== undefined ? (body.latitude ? Number(body.latitude) : null) : undefined,
      longitude:    body.longitude    !== undefined ? (body.longitude ? Number(body.longitude) : null) : undefined,
      architect:    body.architect    !== undefined ? (body.architect ? String(body.architect) : null) : undefined,
      deliveryDate: body.deliveryDate !== undefined ? (body.deliveryDate ? String(body.deliveryDate) : null) : undefined,
      totalUnits:   body.totalUnits   !== undefined ? (body.totalUnits ? Number(body.totalUnits) : null) : undefined,
      floors:       body.floors       !== undefined ? (body.floors ? Number(body.floors) : null) : undefined,
      bedroomsMin:  body.bedroomsMin  !== undefined ? (body.bedroomsMin ? Number(body.bedroomsMin) : null) : undefined,
      bedroomsMax:  body.bedroomsMax  !== undefined ? (body.bedroomsMax ? Number(body.bedroomsMax) : null) : undefined,
      suitesMin:    body.suitesMin    !== undefined ? (body.suitesMin ? Number(body.suitesMin) : null) : undefined,
      suitesMax:    body.suitesMax    !== undefined ? (body.suitesMax ? Number(body.suitesMax) : null) : undefined,
      areaMin:      body.areaMin      !== undefined ? (body.areaMin ? Number(body.areaMin) : null) : undefined,
      areaMax:      body.areaMax      !== undefined ? (body.areaMax ? Number(body.areaMax) : null) : undefined,
      priceMin:     body.priceMin     !== undefined ? (body.priceMin ? Number(body.priceMin) : null) : undefined,
      priceMax:     body.priceMax     !== undefined ? (body.priceMax ? Number(body.priceMax) : null) : undefined,
      financing:    body.financing    !== undefined ? (body.financing ? String(body.financing) : null) : undefined,
      coverUrl:     body.coverUrl     !== undefined ? (body.coverUrl ? String(body.coverUrl) : null) : undefined,
      logoUrl:      body.logoUrl      !== undefined ? (body.logoUrl ? String(body.logoUrl) : null) : undefined,
      amenities:    body.amenities    !== undefined ? (body.amenities ? String(body.amenities) : null) : undefined,
      highlights:   body.highlights   !== undefined ? (body.highlights ? String(body.highlights) : null) : undefined,
      ctaLabel:        body.ctaLabel        !== undefined ? (body.ctaLabel ? String(body.ctaLabel) : null) : undefined,
      ctaWhatsapp:     body.ctaWhatsapp     !== undefined ? (body.ctaWhatsapp ? String(body.ctaWhatsapp) : null) : undefined,
      ctaUrl:          body.ctaUrl          !== undefined ? (body.ctaUrl ? String(body.ctaUrl) : null) : undefined,
      youtubeUrl:      body.youtubeUrl      !== undefined ? (body.youtubeUrl ? String(body.youtubeUrl) : null) : undefined,
      virtualTourUrl:  body.virtualTourUrl  !== undefined ? (body.virtualTourUrl ? String(body.virtualTourUrl) : null) : undefined,
      virtualTourType: body.virtualTourType !== undefined ? (body.virtualTourType ? String(body.virtualTourType) : 'NONE') : undefined,
    },
  })
  revalidateSite('empreendimentos')
  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  await prisma.empreendimento.delete({ where: { id } })
  revalidateSite('empreendimentos')
  return NextResponse.json({ success: true })
}
