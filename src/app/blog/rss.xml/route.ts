export const dynamic = 'force-dynamic'

/**
 * v1.3 — GET /blog/rss.xml: feed RSS 2.0 com os últimos 30 posts visíveis
 * (PUBLISHED e publishedAt <= agora). Público; cache de 10 min no CDN.
 */
import { prisma } from '@/lib/prisma'
import { absUrl } from '@/lib/site'
import { escapeHtml } from '@/lib/sanitize'
import { blogPublishedWhere, excerptFromContent } from '@/lib/blog'

export async function GET() {
  const posts = await prisma.blogPost.findMany({
    where: blogPublishedWhere(),
    orderBy: [{ publishedAt: 'desc' }],
    take: 30,
    select: { slug: true, title: true, excerpt: true, content: true, coverUrl: true, category: true, publishedAt: true, updatedAt: true, author: { select: { name: true } } },
  })

  const items = posts.map(p => {
    const link = absUrl(`/blog/${p.slug}`)
    const desc = p.excerpt || excerptFromContent(p.content, 300)
    const cover = absUrl(p.coverUrl)
    return `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${(p.publishedAt ?? p.updatedAt).toUTCString()}</pubDate>
      <dc:creator>${escapeHtml(p.author.name)}</dc:creator>
      ${p.category ? `<category>${escapeHtml(p.category)}</category>` : ''}
      <description>${escapeHtml(desc)}</description>
      ${cover ? `<enclosure url="${escapeHtml(cover)}" type="image/jpeg" length="0" />` : ''}
    </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Blog Paulo Pop — mercado imobiliário do DF</title>
    <link>${absUrl('/blog')}</link>
    <atom:link href="${absUrl('/blog/rss.xml')}" rel="self" type="application/rss+xml" />
    <description>Guias para comprar, vender e alugar, análises do mercado e novidades das cidades do Distrito Federal.</description>
    <language>pt-BR</language>
    <lastBuildDate>${(posts[0]?.publishedAt ?? new Date()).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
    },
  })
}
