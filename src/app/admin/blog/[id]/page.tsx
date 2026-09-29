export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getPublishedCityLinksCached } from '@/lib/city-pages'
import { parseSections } from '@/lib/sections'
import { toBrasiliaInput } from '@/lib/blog'
import { BlogPostEditor } from '@/components/admin/BlogPostEditor'

export default async function EditBlogPostPage({ params }: { params: { id: string } }) {
  const [post, cities] = await Promise.all([
    prisma.blogPost.findUnique({ where: { id: params.id } }),
    getPublishedCityLinksCached().catch(() => []),
  ])

  if (!post) notFound()

  return (
    <BlogPostEditor
      cities={cities}
      initial={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? '',
        content: post.content,
        coverUrl: post.coverUrl ?? '',
        category: post.category ?? '',
        tags: post.tags,
        series: post.series ?? '',
        citySlug: post.citySlug ?? '',
        featured: post.featured,
        sections: parseSections(post.sections),
        status: post.status,
        publishedAt: toBrasiliaInput(post.publishedAt),
        seoTitle: post.seoTitle ?? '',
        seoDescription: post.seoDescription ?? '',
        ogImageUrl: post.ogImageUrl ?? '',
        readingMinutes: post.readingMinutes ?? null,
      }}
    />
  )
}
