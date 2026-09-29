export const dynamic = 'force-dynamic'

/**
 * v1.3 — POST /api/admin/blog/[id]/duplicar
 * Cria uma cópia do post como rascunho ("Título (cópia)", slug novo, sem data de publicação,
 * sem destaque), com o usuário logado como autor. Devolve o post criado.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { revalidateSite } from '@/lib/cache'
import { uniqueBlogSlug } from '../../shared'
import type { Prisma } from '@prisma/client'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response

  const src = await prisma.blogPost.findUnique({ where: { id: params.id } })
  if (!src) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })

  const title = `${src.title} (cópia)`.slice(0, 200)
  const copy = await prisma.blogPost.create({
    data: {
      slug: await uniqueBlogSlug(title),
      title,
      excerpt: src.excerpt,
      content: src.content,
      coverUrl: src.coverUrl,
      category: src.category,
      tags: src.tags,
      status: 'DRAFT',
      authorId: auth.user.id,
      publishedAt: null,
      sections: (src.sections ?? []) as Prisma.InputJsonValue,
      seoTitle: src.seoTitle,
      seoDescription: src.seoDescription,
      ogImageUrl: src.ogImageUrl,
      readingMinutes: src.readingMinutes,
      citySlug: src.citySlug,
      series: src.series,
      featured: false,
    },
  })

  revalidateSite('blog')
  return NextResponse.json(copy, { status: 201 })
}
