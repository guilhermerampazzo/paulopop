export const dynamic = 'force-dynamic'

/**
 * Blog (painel) — um post: GET, PUT, DELETE.
 * v1.3: campos novos, agendamento (publishedAt no horário de Brasília), tempo de leitura,
 * slug segue o título só enquanto rascunho (ou quando o usuário edita o campo).
 */
import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireSession } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { revalidateSite } from '@/lib/cache'
import { normalizeBlogBody, parsePublishedAt, readingFrom, uniqueBlogSlug, type BlogBody } from '../shared'

// GET /api/admin/blog/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response

  const post = await prisma.blogPost.findUnique({
    where: { id: params.id },
    include: { author: { select: { name: true, email: true } } },
  })
  if (!post) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })

  return NextResponse.json(post)
}

// PUT /api/admin/blog/[id]
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response

  const existing = await prisma.blogPost.findUnique({
    where: { id: params.id },
    select: { id: true, slug: true, title: true, status: true, publishedAt: true, content: true, sections: true },
  })
  if (!existing) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })

  const body = await request.json().catch(() => ({})) as BlogBody
  const data = normalizeBlogBody(body)

  if (data.title !== undefined && !String(data.title)) {
    return NextResponse.json({ error: 'O título é obrigatório' }, { status: 400 })
  }
  if (data.content !== undefined && !String(data.content)) {
    return NextResponse.json({ error: 'O conteúdo é obrigatório' }, { status: 400 })
  }

  // Slug: o usuário editou o campo → usa o valor dele; rascunho com slug automático → segue o título;
  // post já publicado nunca muda de slug sozinho.
  const sentSlug = typeof body.slug === 'string' ? body.slug.trim() : ''
  if (sentSlug && sentSlug !== existing.slug) {
    data.slug = await uniqueBlogSlug(sentSlug, existing.id)
  } else if (body.slugAuto === true && existing.status !== 'PUBLISHED' && data.title && data.title !== existing.title) {
    data.slug = await uniqueBlogSlug(String(data.title), existing.id)
  }

  // Status e data de publicação
  const nextStatus = (data.status as 'DRAFT' | 'PUBLISHED' | undefined) ?? existing.status
  const sentAt = parsePublishedAt(body)
  if (sentAt !== undefined) {
    data.publishedAt = sentAt
  }
  if (nextStatus === 'PUBLISHED' && !(data.publishedAt ?? existing.publishedAt)) {
    data.publishedAt = new Date() // primeira publicação sem data → agora
  }

  // Tempo de leitura sempre recalculado quando corpo ou blocos mudam
  if (data.content !== undefined || data.sections !== undefined) {
    data.readingMinutes = readingFrom(
      String(data.content ?? existing.content),
      data.sections ?? existing.sections ?? [],
    )
  }

  const updated = await prisma.blogPost.update({
    where: { id: params.id },
    data: data as Prisma.BlogPostUncheckedUpdateInput,
  })
  revalidateSite('blog')
  return NextResponse.json(updated)
}

// DELETE /api/admin/blog/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response

  await prisma.blogPost.delete({ where: { id: params.id } })
  revalidateSite('blog')
  return NextResponse.json({ success: true })
}
