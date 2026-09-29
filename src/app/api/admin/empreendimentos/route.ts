export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidateSite } from '@/lib/cache'

function slug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const items = await prisma.empreendimento.findMany({
    orderBy: { createdAt: 'desc' },
    include: { images: { orderBy: { order: 'asc' }, take: 1 } },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json() as Record<string, unknown>
  const name = String(body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const base = slug(name)
  let candidate = base
  let i = 1
  while (await prisma.empreendimento.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${i++}`
  }

  const item = await prisma.empreendimento.create({
    data: {
      slug: candidate,
      name,
      tagline:      body.tagline      ? String(body.tagline)      : null,
      description:  body.description  ? String(body.description)  : null,
      status:       body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      address:      body.address      ? String(body.address)      : null,
      neighborhood: body.neighborhood ? String(body.neighborhood) : null,
      city:         body.city         ? String(body.city)         : null,
      state:        body.state        ? String(body.state)        : null,
      latitude:     body.latitude     ? Number(body.latitude)     : null,
      longitude:    body.longitude    ? Number(body.longitude)    : null,
      architect:    body.architect    ? String(body.architect)    : null,
      deliveryDate: body.deliveryDate ? String(body.deliveryDate) : null,
      totalUnits:   body.totalUnits   ? Number(body.totalUnits)   : null,
      floors:       body.floors       ? Number(body.floors)       : null,
      bedroomsMin:  body.bedroomsMin  ? Number(body.bedroomsMin)  : null,
      bedroomsMax:  body.bedroomsMax  ? Number(body.bedroomsMax)  : null,
      areaMin:      body.areaMin      ? Number(body.areaMin)      : null,
      areaMax:      body.areaMax      ? Number(body.areaMax)      : null,
      priceMin:     body.priceMin     ? Number(body.priceMin)     : null,
      priceMax:     body.priceMax     ? Number(body.priceMax)     : null,
      financing:    body.financing    ? String(body.financing)    : null,
      coverUrl:     body.coverUrl     ? String(body.coverUrl)     : null,
      logoUrl:      body.logoUrl      ? String(body.logoUrl)      : null,
      amenities:    body.amenities    ? String(body.amenities)    : null,
      highlights:   body.highlights   ? String(body.highlights)   : null,
      ctaLabel:     body.ctaLabel     ? String(body.ctaLabel)     : null,
      ctaWhatsapp:  body.ctaWhatsapp  ? String(body.ctaWhatsapp)  : null,
      ctaUrl:       body.ctaUrl       ? String(body.ctaUrl)       : null,
    },
  })
  revalidateSite('empreendimentos')
  return NextResponse.json(item, { status: 201 })
}
