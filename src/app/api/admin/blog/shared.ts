/**
 * v1.3 — normalização do corpo enviado pelo editor do blog (POST/PUT) e slug único.
 * Usado por `route.ts`, `[id]/route.ts` e `[id]/duplicar/route.ts`.
 */
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sanitizeHtml, stripHtml, limitString } from '@/lib/sanitize'
import { sanitizeSections } from '@/lib/sections-sanitize'
import { slugify } from '@/lib/utils'
import { computeReadingMinutes, parseBrasiliaDateTime } from '@/lib/blog'

const SAFE_URL = /^(https?:\/\/|\/(?!\/))/i
const optUrl = (v: unknown): string | null => {
  const s = String(v ?? '').trim()
  return s && SAFE_URL.test(s) ? limitString(s, 2000) : null
}
const optText = (v: unknown, max: number): string | null => {
  const s = limitString(stripHtml(String(v ?? '')), max).trim()
  return s || null
}

/** Slug único (ignora o próprio post ao editar). */
export async function uniqueBlogSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(String(base ?? '')).slice(0, 120) || 'post'
  let slug = root
  let n = 1
  for (;;) {
    const found = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } })
    if (!found || found.id === excludeId) return slug
    n++
    slug = `${root}-${n}`
  }
}

export interface BlogBody {
  title?: unknown
  slug?: unknown
  /** true quando o slug deve seguir o título (campo não editado pelo usuário). */
  slugAuto?: unknown
  excerpt?: unknown
  content?: unknown
  coverUrl?: unknown
  category?: unknown
  tags?: unknown
  series?: unknown
  citySlug?: unknown
  featured?: unknown
  sections?: unknown
  status?: unknown
  /** "YYYY-MM-DDTHH:mm" no horário de Brasília (ou ISO). */
  publishedAt?: unknown
  seoTitle?: unknown
  seoDescription?: unknown
  ogImageUrl?: unknown
}

/** Campos prontos para o Prisma; só inclui o que veio no corpo. */
export function normalizeBlogBody(body: BlogBody) {
  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = limitString(stripHtml(String(body.title)), 200).trim()
  if (body.excerpt !== undefined) data.excerpt = optText(body.excerpt, 500)
  if (body.content !== undefined) data.content = sanitizeHtml(String(body.content ?? ''))
  if (body.coverUrl !== undefined) data.coverUrl = optUrl(body.coverUrl)
  if (body.category !== undefined) data.category = optText(body.category, 60)
  if (body.tags !== undefined) {
    data.tags = (Array.isArray(body.tags) ? body.tags : [])
      .map(t => limitString(stripHtml(String(t ?? '')), 40).trim())
      .filter(Boolean)
      .filter((t, i, a) => a.indexOf(t) === i)
      .slice(0, 20)
  }
  if (body.series !== undefined) data.series = optText(body.series, 80)
  if (body.citySlug !== undefined) {
    const s = String(body.citySlug ?? '').trim().toLowerCase()
    data.citySlug = /^[a-z0-9-]{1,80}$/.test(s) ? s : null
  }
  if (body.featured !== undefined) data.featured = !!body.featured
  if (body.sections !== undefined) data.sections = sanitizeSections(body.sections)
  if (body.seoTitle !== undefined) data.seoTitle = optText(body.seoTitle, 120)
  if (body.seoDescription !== undefined) data.seoDescription = optText(body.seoDescription, 300)
  if (body.ogImageUrl !== undefined) data.ogImageUrl = optUrl(body.ogImageUrl)
  if (body.status !== undefined) data.status = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
  return data
}

/** Data de publicação enviada pelo editor (Brasília) → Date; undefined se não veio; null se vazia. */
export function parsePublishedAt(body: BlogBody): Date | null | undefined {
  if (body.publishedAt === undefined) return undefined
  if (body.publishedAt === null || body.publishedAt === '') return null
  return parseBrasiliaDateTime(String(body.publishedAt))
}

/** Tempo de leitura a partir do conteúdo e blocos já normalizados. */
export function readingFrom(content: string, sections: unknown): number {
  return computeReadingMinutes(content, sanitizeSections(sections))
}

export const LIST_SELECT = {
  id: true, slug: true, title: true, excerpt: true, coverUrl: true,
  category: true, tags: true, status: true, publishedAt: true, createdAt: true, updatedAt: true,
  citySlug: true, series: true, featured: true, readingMinutes: true,
  author: { select: { name: true } },
} satisfies Prisma.BlogPostSelect

export type BlogListRow = Prisma.BlogPostGetPayload<{ select: typeof LIST_SELECT }>

/** Filtro da lista do painel: busca (título/categoria/série/tag) e status DRAFT | PUBLISHED | SCHEDULED. */
export function blogListWhere(q: string | null | undefined, status: string | null | undefined, now = new Date()): Prisma.BlogPostWhereInput {
  const and: Prisma.BlogPostWhereInput[] = []
  const term = String(q ?? '').trim()
  if (term) {
    and.push({ OR: [
      { title: { contains: term, mode: 'insensitive' } },
      { category: { contains: term, mode: 'insensitive' } },
      { series: { contains: term, mode: 'insensitive' } },
      { tags: { has: term } },
    ] })
  }
  if (status === 'DRAFT') and.push({ status: 'DRAFT' })
  else if (status === 'SCHEDULED') and.push({ status: 'PUBLISHED', publishedAt: { gt: now } })
  else if (status === 'PUBLISHED') and.push({ status: 'PUBLISHED', OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] })
  return and.length ? { AND: and } : {}
}
