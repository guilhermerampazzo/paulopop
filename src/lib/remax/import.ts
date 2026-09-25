import type { FeatureType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { saveImageBuffer, deleteFile } from '@/lib/upload'
import { slugify } from '@/lib/utils'
import { mapRemaxListing, parseRemaxId, type MappedProperty, type RemaxLabels, type RemaxListing } from './map'
import { downloadRemaxImage, fetchRemaxAgent, fetchRemaxLabels, fetchRemaxListing } from './client'

export interface ImportInput {
  /** Link do anúncio na RE/MAX (ou o ID, ex.: 880221062-25). */
  url?: string
  /** Dados colados a partir do botão "Copiar para o Paulo Pop" (quando a RE/MAX bloqueia o servidor). */
  payload?: { listing: RemaxListing; labels?: Partial<RemaxLabels>; agent?: { agentName?: string | null; officeName?: string | null } }
  /** Corretor do site que fica responsável pelo imóvel. */
  agentId: string
  /** true = publica no site na hora (status Ativo). */
  publish: boolean
}

export interface ImportResult {
  id: string
  slug: string
  ref: string
  created: boolean
  status: string
  images: number
  imagesFailed: number
  sourceAgentName: string | null
  sourceOfficeName: string | null
  warnings: string[]
}

async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base).slice(0, 120) || 'imovel'
  let slug = root
  for (let i = 2; i < 50; i++) {
    const found = await prisma.property.findUnique({ where: { slug }, select: { id: true } })
    if (!found || found.id === ignoreId) return slug
    slug = `${root}-${i}`
  }
  return `${root}-${Date.now()}`
}

function propertyData(m: MappedProperty, publish: boolean) {
  const status = m.status === 'ACTIVE' ? (publish ? 'ACTIVE' : 'DRAFT') : m.status
  return {
    purpose: m.purpose,
    transactionType: m.transactionType,
    status,
    contractType: m.contractType,
    propertyType: m.propertyType,
    marketStatus: m.marketStatus,
    category: m.category,
    landUse: m.landUse,
    availabilityDate: m.availabilityDate,
    expiryDate: m.expiryDate,
    constructionYear: m.constructionYear,
    constructionMonth: m.constructionMonth,
    price: m.price,
    condominiumFee: m.condominiumFee,
    condominiumFeePeriod: m.condominiumFeePeriod,
    iptu: m.iptu,
    iptuPeriod: m.iptuPeriod,
    totalArea: m.totalArea,
    usefulArea: m.usefulArea,
    landArea: m.landArea,
    floors: m.floors,
    environments: m.environments,
    bedrooms: m.bedrooms,
    bathrooms: m.bathrooms,
    suites: m.suites,
    totalParkingSpots: m.totalParkingSpots,
    zipCode: m.zipCode,
    address: m.address,
    number: m.number,
    neighborhood: m.neighborhood,
    city: m.city,
    state: m.state,
    region: m.region,
    latitude: m.latitude,
    longitude: m.longitude,
    showFullAddress: m.showFullAddress,
    title: m.title,
    description: m.description,
    extraFeatures: m.extraFeatures,
    virtualTourUrl: m.virtualTourUrl,
    virtualTourType: m.virtualTourUrl ? 'OTHER' as const : 'NONE' as const,
    externalLink: m.sourceUrl,
    sourcePortal: 'remax',
    sourceId: m.sourceId,
    sourceUrl: m.sourceUrl,
    importedAt: new Date(),
    publishedAt: status === 'ACTIVE' ? new Date() : null,
  }
}

export async function importRemaxListing(input: ImportInput): Promise<ImportResult> {
  const warnings: string[] = []

  // 1. Dados do anúncio
  let listing: RemaxListing
  let labels: RemaxLabels
  let agentInfo: { agentName: string | null; officeName: string | null } = { agentName: null, officeName: null }

  if (input.payload?.listing) {
    listing = input.payload.listing
    const pl = input.payload.labels
    if (pl?.lookups && Object.keys(pl.lookups).length) {
      labels = { lookups: pl.lookups, translations: pl.translations ?? {} }
    } else {
      try { labels = await fetchRemaxLabels() } catch {
        labels = { lookups: {}, translations: {} }
        warnings.push('Rótulos da RE/MAX indisponíveis: tipo e status podem ter ficado em branco.')
      }
    }
    agentInfo = { agentName: input.payload.agent?.agentName ?? null, officeName: input.payload.agent?.officeName ?? null }
  } else {
    const mlsid = parseRemaxId(input.url ?? '')
    if (!mlsid) throw new Error('Link inválido. Cole o endereço de um anúncio de remax.com.br (termina com o ID, ex.: 880221062-25).')
    ;[listing, labels] = await Promise.all([fetchRemaxListing(mlsid), fetchRemaxLabels()])
  }

  const m = mapRemaxListing(listing, labels)
  if (!agentInfo.agentName) agentInfo = await fetchRemaxAgent(m.agentIds)

  // 2. Fotos (baixa antes de gravar, para não deixar o imóvel sem foto se a rede cair)
  const saved = await mapConcurrent(m.images, 4, async img => {
    try {
      const buf = await downloadRemaxImage(img.url)
      return await saveImageBuffer(buf)
    } catch {
      return null
    }
  })
  const photos = saved.filter((s): s is { url: string; thumbnailUrl: string } => !!s)
  const imagesFailed = m.images.length - photos.length
  if (imagesFailed > 0) warnings.push(`${imagesFailed} foto(s) não puderam ser baixadas.`)
  if (m.images.length === 0) warnings.push('O anúncio não tem fotos.')

  const altBase = m.title ?? `${m.propertyType ?? 'Imóvel'} em ${m.neighborhood ?? m.city ?? ''}`.trim()
  const imageRows = photos.map((p, i) => ({
    url: p.url, thumbnailUrl: p.thumbnailUrl, order: i, isCover: i === 0, alt: `${altBase} - foto ${i + 1}`,
  }))

  const data = {
    ...propertyData(m, input.publish),
    sourceAgentName: agentInfo.agentName,
    sourceOfficeName: agentInfo.officeName,
  }

  // 3. Grava (atualiza se o mesmo anúncio já foi importado)
  const existing = await prisma.property.findUnique({
    where: { sourceId: m.sourceId },
    select: { id: true, slug: true, ref: true, images: { select: { url: true, thumbnailUrl: true } } },
  })

  const featureRows = m.features.map(f => ({ feature: f as FeatureType }))
  const videoRows = m.videos.map(v => ({ youtubeUrl: v, platform: 'youtube' }))

  let property: { id: string; slug: string; ref: string; status: string }
  if (existing) {
    property = await prisma.$transaction(async tx => {
      await tx.propertyImage.deleteMany({ where: { propertyId: existing.id } })
      await tx.propertyFeature.deleteMany({ where: { propertyId: existing.id } })
      await tx.propertyVideo.deleteMany({ where: { propertyId: existing.id } })
      return tx.property.update({
        where: { id: existing.id },
        data: {
          ...(data as Prisma.PropertyUncheckedUpdateInput),
          images: { create: imageRows },
          features: { create: featureRows },
          videos: { create: videoRows },
        },
        select: { id: true, slug: true, ref: true, status: true },
      })
    })
    await Promise.all(existing.images.flatMap(i => [deleteFile(i.url), i.thumbnailUrl ? deleteFile(i.thumbnailUrl) : Promise.resolve()]))
  } else {
    const refTaken = await prisma.property.findUnique({ where: { ref: m.ref }, select: { id: true } })
    const ref = refTaken ? `${m.ref}-rx` : m.ref
    const slug = await uniqueSlug(m.slugBase)
    property = await prisma.property.create({
      data: {
        ...(data as Omit<Prisma.PropertyUncheckedCreateInput, 'ref' | 'slug' | 'agentId'>),
        ref,
        slug,
        agentId: input.agentId,
        images: { create: imageRows },
        features: { create: featureRows },
        videos: { create: videoRows },
      },
      select: { id: true, slug: true, ref: true, status: true },
    })
  }

  await prisma.activity.create({
    data: {
      propertyId: property.id,
      userId: input.agentId,
      type: existing ? 'PROPERTY_UPDATED' : 'PROPERTY_CREATED',
      description: `${existing ? 'Atualizado' : 'Importado'} da RE/MAX (${m.ref})${agentInfo.agentName ? ` · captação: ${agentInfo.agentName}${agentInfo.officeName ? ` (${agentInfo.officeName})` : ''}` : ''} · ${photos.length} foto(s)`,
    },
  }).catch(() => { /* histórico é opcional */ })

  return {
    id: property.id,
    slug: property.slug,
    ref: property.ref,
    created: !existing,
    status: property.status,
    images: photos.length,
    imagesFailed,
    sourceAgentName: agentInfo.agentName,
    sourceOfficeName: agentInfo.officeName,
    warnings,
  }
}
