export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidateSite } from '@/lib/cache'
import { normalizePropertyUpdateInput } from '@/lib/property-update'
import { requireSession, canManageProperty } from '@/lib/authz'
import { toPublicProperty } from '@/lib/property-public'
import { appendPriceHistory } from '@/lib/price-history'
import { proposePropertySlug, uniqueSlug } from '@/lib/property-slug'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  const user = auth.user ?? null
  const property = await prisma.property.findUnique({
    where: { id: params.id },
    include: {
      images: { orderBy: { order: 'asc' } },
      videos: true,
      documents: true,
      features: true,
      lifestyles: true,
      parkingSpots: true,
      rooms: true,
      additionalFees: true,
      portals: true,
      agent: { select: { id: true, name: true, email: true, phone: true, whatsapp: true, creci: true, avatarUrl: true } },
      condominium: true,
      empreendimento: { select: { id: true, name: true } },
      owner: !!user,
      leads: user ? { orderBy: { createdAt: 'desc' }, take: 10 } : false,
      activities: user ? { orderBy: { createdAt: 'desc' }, take: 20, include: { user: { select: { name: true } } } } : false,
    },
  })

  if (!property) return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })

  // Sem login: só o formato público de imóveis publicados (sem comissões, proprietário, documentos internos)
  if (!user) {
    if (property.status !== 'ACTIVE' || property.hideOnSite) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
    }
    const pub = toPublicProperty(property as unknown as Record<string, unknown>) as Record<string, unknown>
    pub.documents = (property.documents ?? []).filter(d => d.isPublic)
    return NextResponse.json(pub)
  }
  // Logado: corretor comum só vê os próprios imóveis por completo
  if (!canManageProperty(user, property)) {
    return NextResponse.json({ error: 'Sem permissão para este imóvel' }, { status: 403 })
  }
  return NextResponse.json(property)
}

async function loadForWrite(id: string) {
  return prisma.property.findUnique({
    where: { id },
    select: {
      id: true, agentId: true, secondaryAgentId: true,
      // v1.3: histórico de preço e slug com bairro
      ref: true, slug: true, price: true, priceHistory: true, previousSlugs: true,
      propertyType: true, transactionType: true, neighborhood: true, city: true,
    },
  })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const current = await loadForWrite(params.id)
  if (!current) return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
  if (!canManageProperty(auth.user, current)) return NextResponse.json({ error: 'Sem permissão para este imóvel' }, { status: 403 })

  const body = await request.json()

  // Extrair relações antes de normalizar (tratadas separadamente)
  const rawImages: Array<Record<string, unknown>> = Array.isArray(body.images) ? body.images : []
  const rawVideos: Array<Record<string, unknown>> = Array.isArray(body.videos) ? body.videos : []
  // Features: aceitar tanto string[] quanto objetos {feature: string}
  const rawFeatures: string[] = Array.isArray(body.features)
    ? (body.features as Array<unknown>).map(f =>
        typeof f === 'string' ? f : (f as Record<string, unknown>)?.feature as string
      ).filter(Boolean)
    : []
  // Lifestyles: aceitar tanto string[] quanto objetos {lifestyle: string}
  const rawLifestyles: string[] = Array.isArray(body.lifestyles)
    ? (body.lifestyles as Array<unknown>).map(l =>
        typeof l === 'string' ? l : (l as Record<string, unknown>)?.lifestyle as string
      ).filter(Boolean)
    : []

  const data = normalizePropertyUpdateInput(body)

  // Validar FKs opcionais para evitar violação de constraint
  if (data.condominiumId) {
    const exists = await prisma.condominium.findUnique({ where: { id: data.condominiumId as string }, select: { id: true } })
    if (!exists) data.condominiumId = null
  }
  if (data.empreendimentoId) {
    const exists = await prisma.empreendimento.findUnique({ where: { id: data.empreendimentoId as string }, select: { id: true } })
    if (!exists) data.empreendimentoId = null
  }
  // v1.2: unidade do empreendimento; a unidade define o empreendimento e herda a tipologia quando os campos estão vazios
  if (data.unitId) {
    const unit = await prisma.empreendimentoUnit.findUnique({ where: { id: data.unitId as string }, select: { id: true, empreendimentoId: true, unitType: true, floor: true } })
    if (!unit) data.unitId = null
    else {
      data.empreendimentoId = unit.empreendimentoId
      if (data.floor === undefined || data.floor === null || data.floor === '') data.floor = String(unit.floor)
      if (unit.unitType) {
        const t = unit.unitType
        if (!data.bedrooms && t.bedrooms != null) data.bedrooms = t.bedrooms
        if (!data.suites && t.suites != null) data.suites = t.suites
        if (!data.bathrooms && t.bathrooms != null) data.bathrooms = t.bathrooms
        if (!data.totalParkingSpots && t.parking != null) data.totalParkingSpots = t.parking
        if (!data.usefulArea && t.area != null) data.usefulArea = t.area
      }
    }
  }
  if (data.unitId === null || data.empreendimentoId === null) {
    // trocar de empreendimento sem escolher unidade limpa a unidade antiga
    if (data.empreendimentoId === null) data.unitId = null
  }

  // v1.3: registrar mudança de preço em priceHistory (até 30 entradas)
  if ('price' in data) {
    const nextHistory = appendPriceHistory(current.priceHistory, data.price as number | null)
    if (nextHistory) data.priceHistory = nextHistory
  } else if (!Array.isArray(current.priceHistory) || !current.priceHistory.length) {
    const seeded = appendPriceHistory(null, current.price ? Number(current.price) : null)
    if (seeded) data.priceHistory = seeded
  }

  // v1.3: slug com bairro — padrão antigo ou bairro/cidade mudaram e o slug não os contém → novo slug, antigo vai para previousSlugs
  {
    const slugInput = {
      propertyType: ('propertyType' in data ? data.propertyType : current.propertyType) as string | null,
      transactionType: ('transactionType' in data ? data.transactionType : current.transactionType) as string | null,
      neighborhood: ('neighborhood' in data ? data.neighborhood : current.neighborhood) as string | null,
      city: ('city' in data ? data.city : current.city) as string | null,
      ref: current.ref,
    }
    const proposed = proposePropertySlug(current.slug, slugInput)
    if (proposed) {
      const newSlug = await uniqueSlug(proposed, async s => !!(await prisma.property.findFirst({ where: { slug: s, id: { not: current.id } }, select: { id: true } })))
      if (newSlug !== current.slug) {
        data.slug = newSlug
        data.previousSlugs = Array.from(new Set([...(current.previousSlugs ?? []), current.slug])).filter(s => s !== newSlug).slice(-20)
      }
    }
  }

  try {
    // v1.1: tudo numa transação e em lote (antes: dezenas de gravações soltas; erro no meio deixava o imóvel pela metade)
    const property = await prisma.$transaction(async (tx) => {
      // Capa automática: se nenhuma foto estiver marcada como capa, a primeira vira capa
      if (rawImages.length > 0 && !rawImages.some(img => img.isCover)) rawImages[0].isCover = true

      const updated = await tx.property.update({
        where: { id: params.id },
        data: { ...data, updatedAt: new Date() },
      })

      if (body.images !== undefined) {
        const existingIds = rawImages.filter(img => img.id).map(img => img.id as string)
        await tx.propertyImage.deleteMany({ where: { propertyId: params.id, id: { notIn: existingIds } } })
        await Promise.all(rawImages.map((img, i) => {
          if (img.id) {
            return tx.propertyImage.update({
              where: { id: img.id as string },
              data: {
                isCover: Boolean(img.isCover),
                is360: Boolean(img.is360),
                isPanoramic: Boolean(img.isPanoramic),
                order: i,
                alt: (img.alt as string) ?? null,
                caption: (img.caption as string) ?? null,
              },
            })
          }
          return null
        }))
        const toCreate = rawImages
          .map((img, i) => ({ img, i }))
          .filter(({ img }) => !img.id && img.url)
          .map(({ img, i }) => ({
            propertyId: params.id,
            url: img.url as string,
            thumbnailUrl: (img.thumbnailUrl as string) ?? null,
            isCover: Boolean(img.isCover),
            is360: Boolean(img.is360),
            isPanoramic: Boolean(img.isPanoramic),
            order: i,
            alt: (img.alt as string) ?? null,
            caption: (img.caption as string) ?? null,
          }))
        if (toCreate.length) await tx.propertyImage.createMany({ data: toCreate })
      }

      if (body.videos !== undefined) {
        await tx.propertyVideo.deleteMany({ where: { propertyId: params.id } })
        const vids = rawVideos.filter(v => v.youtubeUrl).map(v => ({ propertyId: params.id, youtubeUrl: String(v.youtubeUrl), platform: (v.platform as string) ?? 'youtube' }))
        if (vids.length) await tx.propertyVideo.createMany({ data: vids })
      }

      if (body.features !== undefined) {
        await tx.propertyFeature.deleteMany({ where: { propertyId: params.id } })
        if (rawFeatures.length) {
          await tx.propertyFeature.createMany({ data: rawFeatures.map(f => ({ propertyId: params.id, feature: f as never })), skipDuplicates: true })
        }
      }

      if (body.lifestyles !== undefined) {
        await tx.propertyLifestyle.deleteMany({ where: { propertyId: params.id } })
        if (rawLifestyles.length) {
          await tx.propertyLifestyle.createMany({ data: rawLifestyles.map(l => ({ propertyId: params.id, lifestyle: l as never })), skipDuplicates: true })
        }
      }

      return updated
    })

    revalidateSite('properties')
    return NextResponse.json(property)
  } catch (error) {
    console.error('Erro ao atualizar imóvel:', error)
    const message = error instanceof Error ? error.message : 'Erro ao salvar imóvel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const current = await loadForWrite(params.id)
  if (!current) return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
  if (!canManageProperty(auth.user, current)) return NextResponse.json({ error: 'Sem permissão para este imóvel' }, { status: 403 })

  await prisma.property.delete({ where: { id: params.id } })
  revalidateSite('properties')
  return NextResponse.json({ success: true })
}
