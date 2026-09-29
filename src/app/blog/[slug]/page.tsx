export const dynamic = 'force-dynamic'

/**
 * v1.3 — Página do post: capa grande, categoria/tags, autor (foto, CRECI, mini bio → /sobre),
 * data e tempo de leitura, índice lateral dos <h2>/<h3>, corpo HTML sanitizado, blocos extras
 * (SectionRenderer), compartilhar, "Imóveis nesta região", relacionados, próximo da série,
 * CTA final e JSON-LD BlogPosting. `?preview=1` mostra rascunho/agendado só para quem está logado.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Prisma } from '@prisma/client'
import { ArrowLeft, ArrowRight, Calendar, ChevronRight, Clock, Eye, Tag } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { absUrl } from '@/lib/site'
import { getSiteConfigCached } from '@/lib/cache'
import { getSessionUser } from '@/lib/authz'
import { sanitizeHtml } from '@/lib/sanitize'
import { parseSections, type SectionCta } from '@/lib/sections'
import { fetchPropertiesForSection } from '@/lib/section-data'
import { addHeadingIds, blogPublishedWhere, contentToHtml, excerptFromContent, formatBlogDate, isVisiblePost, postVisibility, VISIBILITY_LABEL } from '@/lib/blog'
import { CtaBlock, SectionRenderer } from '@/components/public/SectionRenderer'
import { PropertyCarousel } from '@/components/public/PropertyCarousel'
import { BlogCard, AuthorAvatar } from '@/components/public/BlogCard'
import { BlogShare } from '@/components/public/BlogShare'
import { BlogToc } from '@/components/public/BlogToc'

interface Props { params: { slug: string }; searchParams: { preview?: string } }

const AUTHOR_SELECT = { name: true, avatarUrl: true, creci: true, bio: true } satisfies Prisma.UserSelect

async function loadPost(slug: string, preview: boolean) {
  const post = await prisma.blogPost.findUnique({ where: { slug }, include: { author: { select: AUTHOR_SELECT } } })
  if (!post) return null
  if (isVisiblePost(post)) return { post, isPreview: false }
  if (!preview) return null
  const user = await getSessionUser()
  if (!user) return null
  return { post, isPreview: true }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const data = await loadPost(params.slug, searchParams.preview === '1')
  if (!data) return { title: 'Artigo não encontrado', robots: { index: false } }
  const { post, isPreview } = data
  const title = post.seoTitle || post.title
  const description = post.seoDescription || post.excerpt || excerptFromContent(post.content)
  const og = absUrl(post.ogImageUrl || post.coverUrl)
  const url = absUrl(`/blog/${post.slug}`)
  return {
    title,
    description,
    alternates: { canonical: url },
    ...(isPreview ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: `${title} | Paulo Pop`,
      description,
      url,
      type: 'article',
      locale: 'pt_BR',
      ...(og ? { images: [{ url: og }] } : {}),
      ...(post.publishedAt ? { publishedTime: post.publishedAt.toISOString() } : {}),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author.name],
      ...(post.tags.length ? { tags: post.tags } : {}),
    },
    twitter: { card: 'summary_large_image', title, description, ...(og ? { images: [og] } : {}) },
  }
}

const RELATED_SELECT = {
  id: true, slug: true, title: true, excerpt: true, coverUrl: true, category: true, publishedAt: true, readingMinutes: true,
  author: { select: { name: true, avatarUrl: true, creci: true } },
} satisfies Prisma.BlogPostSelect

export default async function BlogPostPage({ params, searchParams }: Props) {
  const data = await loadPost(params.slug, searchParams.preview === '1')
  if (!data) notFound()
  const { post, isPreview } = data
  const now = new Date()
  const visible = blogPublishedWhere(now)

  const config = await getSiteConfigCached().catch(() => null)
  const whatsapp = config?.ownerWhatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP ?? ''
  const url = absUrl(`/blog/${post.slug}`) as string

  // Corpo com ids nos títulos (índice lateral)
  const { html, toc } = addHeadingIds(sanitizeHtml(contentToHtml(post.content)))
  const sections = parseSections(post.sections).filter(s => s.visible !== false)
  const hasCtaSection = sections.some(s => s.type === 'cta')

  // Cidade ligada: citySlug ou tag que casa com uma página de cidade publicada
  const cityPage = await prisma.cityPage.findFirst({
    where: {
      status: 'PUBLISHED',
      OR: [
        ...(post.citySlug ? [{ slug: post.citySlug }] : []),
        ...(post.tags.length ? [{ name: { in: post.tags, mode: 'insensitive' as const } }, { slug: { in: post.tags.map(t => t.toLowerCase()) } }] : []),
      ],
    },
    select: { slug: true, name: true, matchNames: true },
  })
  const cityNames = cityPage ? (cityPage.matchNames.length ? cityPage.matchNames : [cityPage.name]) : []

  // Relacionados: mesma categoria, mesma cidade ou tags em comum (sem critério → mais recentes)
  const relatedOr: Prisma.BlogPostWhereInput[] = [
    ...(post.category ? [{ category: post.category }] : []),
    ...(post.citySlug ? [{ citySlug: post.citySlug }] : []),
    ...(post.tags.length ? [{ tags: { hasSome: post.tags } }] : []),
  ]

  const [regionProperties, related, nextInSeries, prevInSeries] = await Promise.all([
    cityNames.length ? fetchPropertiesForSection({ mode: 'auto', names: cityNames, ids: [], transactionType: 'ALL', limit: 8 }) : Promise.resolve([]),
    prisma.blogPost.findMany({
      where: { ...visible, id: { not: post.id }, ...(relatedOr.length ? { OR: relatedOr } : {}) },
      orderBy: [{ publishedAt: 'desc' }],
      take: 3,
      select: RELATED_SELECT,
    }),
    post.series && post.publishedAt
      ? prisma.blogPost.findFirst({ where: { status: 'PUBLISHED', series: post.series, id: { not: post.id }, publishedAt: { gt: post.publishedAt, lte: now } }, orderBy: { publishedAt: 'asc' }, select: { slug: true, title: true } })
      : Promise.resolve(null),
    post.series && post.publishedAt
      ? prisma.blogPost.findFirst({ where: { status: 'PUBLISHED', series: post.series, id: { not: post.id }, publishedAt: { lt: post.publishedAt, lte: now } }, orderBy: { publishedAt: 'desc' }, select: { slug: true, title: true } })
      : Promise.resolve(null),
  ])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    ...(post.coverUrl || post.ogImageUrl ? { image: absUrl(post.ogImageUrl || post.coverUrl) } : {}),
    url,
    mainEntityOfPage: url,
    datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { '@type': 'Person', name: post.author.name, url: absUrl('/sobre') },
    publisher: { '@type': 'Organization', name: 'Paulo Pop Imóveis', url: absUrl('/') },
    ...(post.tags.length ? { keywords: post.tags.join(', ') } : {}),
    ...(post.category ? { articleSection: post.category } : {}),
  }

  const finalCta: SectionCta = {
    id: 'cta-final', type: 'cta', title: 'Quer vender ou alugar seu imóvel?',
    text: 'Avaliação gratuita com quem conhece o mercado do DF e vende imóveis todos os meses.',
    buttonLabel: 'Falar no WhatsApp', whatsappMessage: `Olá! Li o artigo "${post.title}" e quero vender ou alugar meu imóvel.`, showForm: true, style: 'orange',
  }

  const dateLabel = post.publishedAt ? formatBlogDate(post.publishedAt, 'long') : formatBlogDate(post.createdAt, 'long')

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {isPreview && (
        <div className="bg-amber-100 text-amber-900 text-sm px-4 py-2 text-center" role="status">
          <Eye className="inline w-4 h-4 mr-1 -mt-0.5" /> Pré-visualização: este post está como <strong>{VISIBILITY_LABEL[postVisibility(post)]}</strong> e não aparece para os visitantes.
        </div>
      )}

      {/* Capa grande */}
      <section className="relative bg-[#1e3a8a] text-white overflow-hidden">
        {post.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#172554] via-[#1e3a8a]/75 to-[#1e3a8a]/30" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-300 flex items-center gap-1 flex-wrap">
            <Link href="/" className="hover:text-white">Início</Link><ChevronRight className="w-3 h-3" />
            <Link href="/blog" className="hover:text-white">Blog</Link>
            {post.category && (<><ChevronRight className="w-3 h-3" /><Link href={`/blog?categoria=${encodeURIComponent(post.category)}`} className="hover:text-white">{post.category}</Link></>)}
          </nav>
          <div className="mt-6 max-w-3xl min-w-0">
            {post.series && <p className="text-[#fdba74] uppercase tracking-wide text-xs font-semibold">Série: {post.series}</p>}
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl md:text-5xl leading-tight break-words">{post.title}</h1>
            {post.excerpt && <p className="mt-4 text-base md:text-lg text-slate-200 leading-7 break-words">{post.excerpt}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
              <Link href="/sobre" className="flex items-center gap-2 hover:text-white">
                <AuthorAvatar author={post.author} />
                <span>{post.author.name}{post.author.creci ? ` · CRECI ${post.author.creci}` : ''}</span>
              </Link>
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {dateLabel}</span>
              {post.readingMinutes ? <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {post.readingMinutes} min de leitura</span> : null}
            </div>
          </div>
        </div>
      </section>

      <div className="bg-[#f6f7fb] py-10 md:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 min-w-0">
          <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] items-start">
            {/* Índice lateral (desktop) */}
            <div className="hidden lg:block">
              <BlogToc toc={toc} />
            </div>

            <div className="min-w-0 space-y-10">
              <article className="bg-white rounded-2xl p-5 sm:p-8 md:p-10 shadow-sm min-w-0">
                <BlogToc toc={toc} variant="mobile" />

                {/* Corpo */}
                <div className="prose tiptap max-w-none min-w-0 break-words" dangerouslySetInnerHTML={{ __html: html }} />

                {/* Blocos extras */}
                {sections.length > 0 && (
                  <div className="mt-10 pt-8 border-t border-gray-100">
                    <SectionRenderer sections={sections} context={{ whatsapp, cityNames, pageName: cityPage?.name }} />
                  </div>
                )}

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    {post.tags.map(tag => (
                      <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`} className="px-2.5 py-0.5 bg-[#eff6ff] text-[#1e3a8a] text-xs rounded-full hover:bg-[#dbeafe]">
                        {tag}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Compartilhar */}
                <div className="mt-6">
                  <BlogShare url={url} title={post.title} />
                </div>

                {/* Autor */}
                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4">
                  <AuthorAvatar author={post.author} size="lg" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1e3a8a]">
                      <Link href="/sobre" className="hover:underline">{post.author.name}</Link>
                      {post.author.creci && <span className="ml-2 text-xs font-normal text-gray-400">CRECI {post.author.creci}</span>}
                    </p>
                    {post.author.bio && <p className="mt-1 text-sm text-gray-600 line-clamp-3 break-words">{post.author.bio}</p>}
                    <Link href="/sobre" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#2563eb] hover:underline">Conheça o corretor <ArrowRight className="w-3 h-3" /></Link>
                  </div>
                </div>

                {/* Série: anterior / próximo */}
                {post.series && (prevInSeries || nextInSeries) && (
                  <nav className="mt-8 pt-6 border-t border-gray-100 grid gap-3 sm:grid-cols-2" aria-label={`Série ${post.series}`}>
                    {prevInSeries ? (
                      <Link href={`/blog/${prevInSeries.slug}`} className="group rounded-xl border border-gray-100 p-4 hover:border-[#2563eb]/40 min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Anterior da série</p>
                        <p className="mt-1 text-sm font-semibold text-gray-800 group-hover:text-[#1e3a8a] break-words">{prevInSeries.title}</p>
                      </Link>
                    ) : <span />}
                    {nextInSeries && (
                      <Link href={`/blog/${nextInSeries.slug}`} className="group rounded-xl border border-[#1e3a8a]/20 bg-[#eff6ff] p-4 hover:border-[#1e3a8a] sm:text-right min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-[#ea580c] font-semibold inline-flex items-center gap-1">Próximo da série <ArrowRight className="w-3 h-3" /></p>
                        <p className="mt-1 text-sm font-semibold text-[#1e3a8a] break-words">{nextInSeries.title}</p>
                      </Link>
                    )}
                  </nav>
                )}
              </article>

              {/* Imóveis nesta região */}
              {regionProperties.length > 0 && cityPage && (
                <section aria-label={`Imóveis em ${cityPage.name}`}>
                  <p className="text-[#ea580c] uppercase tracking-wide text-xs font-semibold">Imóveis nesta região</p>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-[#1e3a8a] mt-1">Imóveis em {cityPage.name}</h2>
                  <div className="mt-6">
                    <PropertyCarousel properties={regionProperties} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={`/imoveis?cidade=${encodeURIComponent(cityNames[0])}`} className="inline-flex items-center gap-2 rounded-full border border-[#1e3a8a] px-4 py-2 text-sm font-semibold text-[#1e3a8a] hover:bg-[#eff6ff]">Ver todos os imóveis</Link>
                    <Link href={`/cidades/${cityPage.slug}`} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[#2563eb] hover:underline">Conheça {cityPage.name} <ArrowRight className="w-4 h-4" /></Link>
                  </div>
                </section>
              )}

              {/* Relacionados */}
              {related.length > 0 && (
                <section aria-label="Posts relacionados">
                  <p className="text-[#ea580c] uppercase tracking-wide text-xs font-semibold">Continue lendo</p>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-[#1e3a8a] mt-1">Posts relacionados</h2>
                  <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {related.map(r => <BlogCard key={r.id} post={r} compact />)}
                  </div>
                </section>
              )}

              {/* CTA final (se o post não tem uma seção CTA própria) */}
              {!hasCtaSection && <CtaBlock s={finalCta} ctx={{ whatsapp, cityNames, pageName: cityPage?.name }} />}

              <div>
                <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-[#2563eb] hover:underline"><ArrowLeft className="w-4 h-4" /> Voltar ao blog</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
