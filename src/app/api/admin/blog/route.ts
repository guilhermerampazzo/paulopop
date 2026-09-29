export const dynamic = 'force-dynamic'

/**
 * Blog (painel) — lista e criação de posts.
 * v1.3: campos novos (sections, SEO, série, cidade, destaque, agendamento), tempo de leitura,
 * filtro de status com "agendado" (SCHEDULED) e busca por título/categoria/tag.
 */
import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireSession } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { revalidateSite } from '@/lib/cache'
import { LIST_SELECT, blogListWhere, normalizeBlogBody, parsePublishedAt, readingFrom, uniqueBlogSlug, type BlogBody } from './shared'

// GET /api/admin/blog?q=&status=DRAFT|PUBLISHED|SCHEDULED&page=
export async function GET(request: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 20
  const where = blogListWhere(searchParams.get('q'), searchParams.get('status'))

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }],
      select: LIST_SELECT,
    }),
    prisma.blogPost.count({ where }),
  ])

  return NextResponse.json({ posts, total, page, totalPages: Math.ceil(total / pageSize) })
}

// POST /api/admin/blog
export async function POST(request: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({})) as BlogBody
  const data = normalizeBlogBody(body)
  const title = String(data.title ?? '')
  const content = String(data.content ?? '')
  if (!title || !content) {
    return NextResponse.json({ error: 'Título e conteúdo são obrigatórios' }, { status: 400 })
  }

  const slugSource = typeof body.slug === 'string' && body.slug.trim() ? body.slug : title
  const slug = await uniqueBlogSlug(slugSource)
  const status = (data.status as 'DRAFT' | 'PUBLISHED' | undefined) ?? 'DRAFT'
  const sentAt = parsePublishedAt(body)
  const publishedAt = sentAt !== undefined ? sentAt : (status === 'PUBLISHED' ? new Date() : null)

  const post = await prisma.blogPost.create({
    data: {
      ...(data as Prisma.BlogPostUncheckedCreateInput),
      title, content, slug, status,
      tags: (data.tags as string[] | undefined) ?? [],
      sections: (data.sections as Prisma.InputJsonValue | undefined) ?? [],
      readingMinutes: readingFrom(content, data.sections ?? []),
      authorId: auth.user.id,
      publishedAt: status === 'PUBLISHED' ? (publishedAt ?? new Date()) : publishedAt,
    },
  })

  revalidateSite('blog')
  return NextResponse.json(post, { status: 201 })
}
