export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidateSite } from '@/lib/cache'

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: params.id },
    include: {
      images: { orderBy: [{ category: 'asc' }, { order: 'asc' }] },
      floorPlanImages: { orderBy: { order: 'asc' } },
    },
  })

  if (!empreendimento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(empreendimento)
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { images, floorPlanImages, ...fields } = body

  const empreendimento = await prisma.empreendimento.update({
    where: { id: params.id },
    data: {
      name: fields.name,
      tagline: fields.tagline ?? null,
      description: fields.description ?? null,
      status: fields.status ?? 'DRAFT',
      address: fields.address ?? null,
      neighborhood: fields.neighborhood ?? null,
      city: fields.city ?? null,
      state: fields.state ?? null,
      zipCode: fields.zipCode ?? null,
      latitude: fields.latitude ? parseFloat(fields.latitude) : null,
      longitude: fields.longitude ? parseFloat(fields.longitude) : null,
      locationDescription: fields.locationDescription ?? null,
      architect: fields.architect ?? null,
      deliveryDate: fields.deliveryDate ?? null,
      totalUnits: fields.totalUnits ? parseInt(fields.totalUnits) : null,
      floors: fields.floors ? parseInt(fields.floors) : null,
      bedroomsMin: fields.bedroomsMin ? parseInt(fields.bedroomsMin) : null,
      bedroomsMax: fields.bedroomsMax ? parseInt(fields.bedroomsMax) : null,
      // v1.1: suítes, vídeo e tour virtual eram ignorados por esta rota (a tela de edição usa ela)
      // v1.2
      stage: ['LANCAMENTO', 'EM_OBRAS', 'ENTREGUE'].includes(fields.stage) ? fields.stage : 'ENTREGUE',
      deliveryYear: fields.deliveryYear ? parseInt(fields.deliveryYear) : null,
      builder: fields.builder ? String(fields.builder).slice(0, 120) : null,
      elevators: fields.elevators !== undefined && fields.elevators !== '' ? parseInt(fields.elevators) : null,
      condoFeeAvg: fields.condoFeeAvg ? parseFloat(fields.condoFeeAvg) : null,
      petsAllowed: fields.petsAllowed === 'sim' || fields.petsAllowed === true ? true : fields.petsAllowed === 'nao' || fields.petsAllowed === false ? false : null,
      rules: fields.rules ? String(fields.rules).slice(0, 5000) : null,
      suitesMin: fields.suitesMin ? parseInt(fields.suitesMin) : null,
      suitesMax: fields.suitesMax ? parseInt(fields.suitesMax) : null,
      youtubeUrl: fields.youtubeUrl ? String(fields.youtubeUrl).trim() : null,
      virtualTourUrl: fields.virtualTourUrl ? String(fields.virtualTourUrl).trim() : null,
      virtualTourType: fields.virtualTourUrl && fields.virtualTourType && fields.virtualTourType !== 'NONE' ? String(fields.virtualTourType) : 'NONE',
      areaMin: fields.areaMin ? parseFloat(fields.areaMin) : null,
      areaMax: fields.areaMax ? parseFloat(fields.areaMax) : null,
      priceMin: fields.priceMin ? parseFloat(fields.priceMin) : null,
      priceMax: fields.priceMax ? parseFloat(fields.priceMax) : null,
      financing: fields.financing ?? null,
      paymentInfo: fields.paymentInfo ?? null,
      banks: fields.banks ?? null,
      tipologiasDescription: fields.tipologiasDescription ?? null,
      lazerDescription: fields.lazerDescription ?? null,
      coverUrl: fields.coverUrl ?? null,
      logoUrl: fields.logoUrl ?? null,
      amenities: fields.amenities ?? null,
      highlights: fields.highlights ?? null,
      ctaLabel: fields.ctaLabel ?? null,
      ctaWhatsapp: fields.ctaWhatsapp ?? null,
      ctaUrl: fields.ctaUrl ?? null,
    },
  })

  // Sync gallery images
  if (Array.isArray(images)) {
    await prisma.empreendimentoImage.deleteMany({ where: { empreendimentoId: params.id } })
    if (images.length > 0) {
      await prisma.empreendimentoImage.createMany({
        data: images.map((img: {
          url: string; thumbnailUrl?: string; alt?: string;
          caption?: string; order?: number; category?: string
        }, i: number) => ({
          empreendimentoId: params.id,
          url: img.url,
          thumbnailUrl: img.thumbnailUrl ?? null,
          alt: img.alt ?? null,
          caption: img.caption ?? null,
          order: img.order ?? i,
          category: img.category ?? 'FACHADA',
        })),
      })
    }
  }

  // Sync floor plan images
  if (Array.isArray(floorPlanImages)) {
    await prisma.empreendimentoFloorPlan.deleteMany({ where: { empreendimentoId: params.id } })
    if (floorPlanImages.length > 0) {
      await prisma.empreendimentoFloorPlan.createMany({
        data: floorPlanImages.map((img: { url: string; caption?: string; order?: number }, i: number) => ({
          empreendimentoId: params.id,
          url: img.url,
          caption: img.caption ?? null,
          order: img.order ?? i,
        })),
      })
    }
  }

  revalidateSite('empreendimentos')
  return NextResponse.json(empreendimento)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.empreendimento.delete({ where: { id: params.id } })
  revalidateSite('empreendimentos')
  return NextResponse.json({ ok: true })
}
