/**
 * v1.4 — Cadastro de anúncio a partir de um portal (link) ou de texto colado.
 *
 * Regras (decisão do Paulo em 30/09/2026 — "só meus ou autorizados"):
 *  - o imóvel entra sempre como RASCUNHO; nada vai ao ar sozinho;
 *  - as fotos do anúncio original só são copiadas para o site depois que o corretor confirma que o anúncio
 *    é dele ou que tem autorização escrita (Lei 6.530/78, art. 20, III). Antes disso ficam só os endereços;
 *  - publicar depois exige a mesma confirmação (regra na rota de salvar imóvel).
 */
import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { saveImageBuffer } from '@/lib/upload'
import { generateRef } from '@/lib/utils'
import { buildPropertySlug, uniqueSlug } from '@/lib/property-slug'
import { stripHtml, limitString } from '@/lib/sanitize'
import { safeFetch } from '@/lib/net/safe-fetch'
import { normalizeListingUrl, externalIdFromUrl } from '@/lib/intel/url-key'
import { parseNumberBR } from '@/lib/intel/number'
import { cleanPhotoUrls, portalOf, type ListingDraft } from './parse'

export interface DraftImportResult {
  id: string
  ref: string
  slug: string
  created: boolean
  status: string
  images: number
  imagesPending: number
  imagesFailed: number
  warnings: string[]
}

// corta antes de limpar: texto gigante não pode travar o servidor
const txt = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? limitString(stripHtml(v.slice(0, max * 3)).replace(/[ \t]+/g, ' ').trim(), max) || null : null)
const num = (v: unknown, min: number, max: number): number | null => { const n = parseNumberBR(v); return n != null && n >= min && n <= max ? n : null }
const int = (v: unknown, max: number): number | null => { const n = num(v, 0, max); return n == null ? null : Math.round(n) }

/** Limpa os campos vindos da tela (o corretor pode ter corrigido a leitura) ou do conector. */
export function sanitizeDraft(raw: Partial<ListingDraft> & Record<string, unknown>): ListingDraft {
  const url = typeof raw.url === 'string' ? normalizeListingUrl(raw.url)?.url ?? null : null
  const tx = raw.transactionType === 'RENT' ? 'RENT' : raw.transactionType === 'SALE' ? 'SALE' : null
  const desc = typeof raw.description === 'string' ? raw.description.slice(0, 8000) : null
  // portal e código do anúncio vêm sempre do endereço — nunca do que a tela ou o conector informam
  const portal = portalOf(url)
  return {
    url, portal: portal?.name ?? null, portalSlug: portal?.slug ?? 'colado', externalId: url ? externalIdFromUrl(url) : null,
    // a descrição do imóvel é texto puro com quebras de linha (é assim que a página do anúncio mostra)
    title: txt(raw.title, 160), description: desc ? limitString(stripHtml(desc.replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, '\n')).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n'), 8000) || null : null, propertyType: txt(raw.propertyType, 40), transactionType: tx,
    price: num(raw.price, 100, 500_000_000), condoFee: num(raw.condoFee, 0, 100_000), iptu: num(raw.iptu, 0, 1_000_000),
    usefulArea: num(raw.usefulArea, 5, 100_000), totalArea: num(raw.totalArea, 5, 1_000_000),
    bedrooms: int(raw.bedrooms, 30), suites: int(raw.suites, 30), bathrooms: int(raw.bathrooms, 30), parking: int(raw.parking, 50),
    floor: txt(raw.floor, 20), sunPosition: txt(raw.sunPosition, 30), renovation: txt(raw.renovation, 60),
    address: txt(raw.address, 200), neighborhood: txt(raw.neighborhood, 80), city: txt(raw.city, 80), state: txt(raw.state, 2)?.toUpperCase() ?? null, zipCode: txt(raw.zipCode, 9),
    advertiser: txt(raw.advertiser, 200), publishedAt: null,
    photoUrls: cleanPhotoUrls(Array.isArray(raw.photoUrls) ? raw.photoUrls.filter((u): u is string => typeof u === 'string') : []),
    features: Array.isArray(raw.features) ? Array.from(new Set(raw.features.map(f => txt(f, 80)).filter((f): f is string => !!f))).slice(0, 60) : [],
    filled: [],
  }
}

/** Identificador único do anúncio de origem (evita importar duas vezes o mesmo link). */
export function sourceIdOf(d: ListingDraft): string | null {
  if (!d.url) return null
  const norm = normalizeListingUrl(d.url)
  if (!norm) return null
  const slug = d.portalSlug && d.portalSlug !== 'colado' ? d.portalSlug : norm.host
  return `${slug}:${d.externalId ?? createHash('sha256').update(norm.urlKey).digest('hex').slice(0, 16)}`
}

async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i], i) } }))
  return out
}

/** Baixa as fotos do anúncio de origem (só depois da confirmação de autorização). */
export async function downloadSourcePhotos(urls: string[], referer?: string | null, max = 20): Promise<{ saved: Array<{ url: string; thumbnailUrl: string }>; failed: number; failedUrls: string[] }> {
  const list = urls.slice(0, max)
  const res = await mapConcurrent(list, 3, async u => {
    try {
      const r = await safeFetch(u, { accept: 'image/avif,image/webp,image/*,*/*;q=0.5', maxBytes: 12 * 1024 * 1024, timeoutMs: 20000, referer: referer ?? undefined })
      if (r.status !== 200 || (r.contentType && !/^image\//i.test(r.contentType) && !/octet-stream/i.test(r.contentType))) return null
      return await saveImageBuffer(r.body)
    } catch { return null }
  })
  const saved = res.filter((x): x is { url: string; thumbnailUrl: string } => !!x)
  const failedUrls = list.filter((_, i) => !res[i])
  return { saved, failed: failedUrls.length, failedUrls }
}

export interface CreateDraftOptions {
  agentId: string
  /** o corretor marcou "este anúncio é meu ou tenho autorização escrita" */
  authConfirmed: boolean
  /** de onde veio: tela do painel ou conector do Claude */
  via: 'PAINEL' | 'CONECTOR'
  /** administrador enxerga o cadastro existente de qualquer corretor */
  isAdmin?: boolean
}

/** Cria o imóvel em rascunho a partir dos campos lidos. Se o mesmo anúncio já foi importado, devolve o existente. */
export async function createDraftFromListing(input: ListingDraft, opts: CreateDraftOptions): Promise<DraftImportResult> {
  const d = input
  const warnings: string[] = []
  // a RE/MAX tem importador próprio (e regra própria de publicação): não entra por aqui
  if (d.portalSlug === 'remax' || portalOf(d.url)?.slug === 'remax') throw new Error('Anúncio da RE/MAX: use o importador da RE/MAX no painel (Imóveis → Importar anúncio → RE/MAX).')
  const sourceId = sourceIdOf(d)
  if (sourceId) {
    const existing = await prisma.property.findUnique({ where: { sourceId }, select: { id: true, ref: true, slug: true, status: true, agentId: true, secondaryAgentId: true, sourcePhotoUrls: true, _count: { select: { images: true } } } })
    if (existing && !opts.isAdmin && existing.agentId !== opts.agentId && existing.secondaryAgentId !== opts.agentId) {
      throw new Error('Este anúncio já foi importado por outro corretor do site.')
    }
    if (existing) {
      return { id: existing.id, ref: existing.ref, slug: existing.slug, created: false, status: existing.status, images: existing._count.images, imagesPending: existing._count.images ? 0 : existing.sourcePhotoUrls.length, imagesFailed: 0, warnings: ['Este anúncio já tinha sido importado: o cadastro existente foi mantido, sem alterações.'] }
    }
  }
  if (!d.title && !d.price && !d.usefulArea) throw new Error('Não há dados suficientes para criar o cadastro (faltam título, preço e área).')

  let photos: Array<{ url: string; thumbnailUrl: string }> = []
  let failed = 0
  if (opts.authConfirmed && d.photoUrls.length) {
    const r = await downloadSourcePhotos(d.photoUrls, d.url)
    photos = r.saved
    failed = r.failed
    if (failed) warnings.push(`${failed} foto(s) não puderam ser baixadas do portal.`)
  } else if (d.photoUrls.length) {
    warnings.push(`${d.photoUrls.length} foto(s) do anúncio original ficaram guardadas só como endereço. Elas são copiadas para o site quando você confirmar a autorização.`)
  }

  const ref = generateRef()
  const tx = d.transactionType ?? 'SALE'
  const slug = await uniqueSlug(
    buildPropertySlug({ propertyType: d.propertyType, transactionType: tx, neighborhood: d.neighborhood, city: d.city, ref }),
    async s => !!(await prisma.property.findUnique({ where: { slug: s }, select: { id: true } })),
  )
  const area = d.usefulArea ?? d.totalArea
  const altBase = d.title ?? `${d.propertyType ?? 'Imóvel'} em ${d.neighborhood ?? d.city ?? ''}`.trim()
  const data: Prisma.PropertyUncheckedCreateInput = {
    ref, slug, agentId: opts.agentId, status: 'DRAFT', transactionType: tx,
    purpose: /sala|loja|galp|pr[ée]dio|consult|escrit|industrial|hotel/i.test(d.propertyType ?? '') ? 'COMMERCIAL' : 'RESIDENTIAL',
    propertyType: d.propertyType, title: d.title, description: d.description,
    price: d.price, pricePerSqm: d.price && area ? Math.round((d.price / area) * 100) / 100 : null,
    condominiumFee: d.condoFee, condominiumFeePeriod: d.condoFee ? 'Mensal' : null, iptu: d.iptu,
    usefulArea: d.usefulArea, totalArea: d.totalArea, bedrooms: d.bedrooms ?? 0, suites: d.suites ?? 0, bathrooms: d.bathrooms ?? 0, totalParkingSpots: d.parking,
    floor: d.floor, address: d.address, neighborhood: d.neighborhood, city: d.city, state: d.state ?? (d.city ? 'DF' : null), zipCode: d.zipCode,
    extraFeatures: d.features, externalLink: d.url,
    sourcePortal: d.portalSlug ?? 'colado', sourceId, sourceUrl: d.url, sourceAgentName: d.advertiser, importedAt: new Date(),
    sourcePhotoUrls: d.photoUrls,
    publishAuthConfirmedAt: opts.authConfirmed ? new Date() : null, publishAuthConfirmedBy: opts.authConfirmed ? opts.agentId : null,
    images: { create: photos.map((p, i) => ({ url: p.url, thumbnailUrl: p.thumbnailUrl, order: i, isCover: i === 0, alt: `${altBase} - foto ${i + 1}` })) },
  }
  const property = await prisma.property.create({ data, select: { id: true, ref: true, slug: true, status: true } })
  await prisma.activity.create({
    data: { propertyId: property.id, userId: opts.agentId, type: 'PROPERTY_CREATED', description: `Rascunho criado a partir de ${d.portal ?? 'texto colado'}${opts.via === 'CONECTOR' ? ' pelo conector do Claude' : ''}${d.url ? ` (${d.url})` : ''} · ${photos.length} foto(s)${opts.authConfirmed ? ' · autorização confirmada' : ' · autorização pendente'}` },
  }).catch(() => { /* histórico é opcional */ })
  return { id: property.id, ref: property.ref, slug: property.slug, created: true, status: property.status, images: photos.length, imagesPending: opts.authConfirmed ? 0 : d.photoUrls.length, imagesFailed: failed, warnings }
}

/** Depois da confirmação: copia para o site as fotos do anúncio original que estavam só como endereço. */
export async function bringSourcePhotos(propertyId: string, userId: string): Promise<{ added: number; failed: number }> {
  const p = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, title: true, sourceUrl: true, sourcePhotoUrls: true, _count: { select: { images: true } } } })
  if (!p) throw new Error('Imóvel não encontrado')
  if (!p.sourcePhotoUrls.length) return { added: 0, failed: 0 }
  const r = await downloadSourcePhotos(p.sourcePhotoUrls, p.sourceUrl)
  const start = p._count.images
  await prisma.property.update({
    where: { id: p.id },
    data: {
      publishAuthConfirmedAt: new Date(), publishAuthConfirmedBy: userId,
      // o que foi copiado sai da lista de pendentes; o que falhou continua lá para nova tentativa
      sourcePhotoUrls: [...r.failedUrls, ...p.sourcePhotoUrls.slice(20)],
      images: { create: r.saved.map((s, i) => ({ url: s.url, thumbnailUrl: s.thumbnailUrl, order: start + i, isCover: start === 0 && i === 0, alt: `${p.title ?? 'Imóvel'} - foto ${start + i + 1}` })) },
    },
  })
  return { added: r.saved.length, failed: r.failed }
}
