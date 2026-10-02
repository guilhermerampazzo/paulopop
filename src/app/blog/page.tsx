export const dynamic = 'force-dynamic'

/**
 * v1.3 — Hub do blog: capa com o post em destaque, filtros por categoria/cidade (chips),
 * busca, grade de cards, paginação, séries em destaque e bloco "Receba novidades no WhatsApp".
 * Só posts PUBLISHED com publishedAt <= agora.
 */
import { defaultOgImages } from '@/lib/seo-og'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { ArrowRight, Calendar, Clock, MessageCircle, Rss, Search, X } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { absUrl } from '@/lib/site'
import { getSiteConfigCached } from '@/lib/cache'
import { getPublishedCityLinksCached } from '@/lib/city-pages'
import { blogPublishedWhere, formatBlogDate, whatsappLink, FEATURED_SERIES } from '@/lib/blog'
import { BlogCard, AuthorAvatar } from '@/components/public/BlogCard'

// v1.5: generateMetadata para incluir a imagem de compartilhamento padrão
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Blog do mercado imobiliário do DF',
    description: 'Guias para comprar, vender e alugar, análises do mercado e novidades das cidades do Distrito Federal, por Paulo Pop.',
    alternates: { canonical: absUrl('/blog'), types: { 'application/rss+xml': absUrl('/blog/rss.xml') ?? '/blog/rss.xml' } },
    openGraph: { title: 'Blog do mercado imobiliário do DF | Paulo Pop', url: absUrl('/blog'), type: 'website', images: await defaultOgImages() },
  }
}

interface SearchParams { categoria?: string; cidade?: string; tag?: string; busca?: string; page?: string }

const CARD_SELECT = {
  id: true, slug: true, title: true, excerpt: true, coverUrl: true, category: true, tags: true,
  publishedAt: true, readingMinutes: true, series: true, citySlug: true,
  author: { select: { name: true, avatarUrl: true, creci: true } },
} satisfies Prisma.BlogPostSelect

function buildHref(params: SearchParams, patch: Partial<SearchParams>): string {
  const merged: SearchParams = { ...params, ...patch }
  const qs = new URLSearchParams()
  if (merged.categoria) qs.set('categoria', merged.categoria)
  if (merged.cidade) qs.set('cidade', merged.cidade)
  if (merged.tag) qs.set('tag', merged.tag)
  if (merged.busca) qs.set('busca', merged.busca)
  if (merged.page && merged.page !== '1') qs.set('page', merged.page)
  const s = qs.toString()
  return s ? `/blog?${s}` : '/blog'
}

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1') || 1)
  const pageSize = 9
  const categoria = searchParams.categoria?.trim() || undefined
  const cidade = searchParams.cidade?.trim() || undefined
  const tag = searchParams.tag?.trim() || undefined
  const busca = searchParams.busca?.trim().slice(0, 100) || undefined
  const hasFilter = !!(categoria || cidade || tag || busca)
  const now = new Date()
  const visible = blogPublishedWhere(now)

  const where: Prisma.BlogPostWhereInput = {
    ...visible,
    ...(categoria ? { category: { equals: categoria, mode: 'insensitive' } } : {}),
    ...(cidade ? { citySlug: cidade } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(busca ? { OR: [
      { title: { contains: busca, mode: 'insensitive' } },
      { excerpt: { contains: busca, mode: 'insensitive' } },
      { tags: { has: busca.toLowerCase() } },
    ] } : {}),
  }

  const [posts, total, categories, cityRows, cities, config, featured, seriesRows] = await Promise.all([
    prisma.blogPost.findMany({ where, orderBy: [{ publishedAt: 'desc' }], skip: (page - 1) * pageSize, take: pageSize, select: CARD_SELECT }),
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({ where: { ...visible, category: { not: null } }, distinct: ['category'], select: { category: true }, orderBy: { category: 'asc' } }),
    prisma.blogPost.findMany({ where: { ...visible, citySlug: { not: null } }, distinct: ['citySlug'], select: { citySlug: true } }),
    getPublishedCityLinksCached().catch(() => []),
    getSiteConfigCached().catch(() => null),
    // Destaque: post marcado como featured (mais recente) ou o mais recente de todos
    hasFilter || page > 1 ? Promise.resolve(null) : prisma.blogPost.findFirst({ where: visible, orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }], select: CARD_SELECT }),
    hasFilter || page > 1 ? Promise.resolve([]) : prisma.blogPost.findMany({
      where: { ...visible, series: { not: null } },
      orderBy: [{ publishedAt: 'asc' }],
      select: { slug: true, title: true, series: true, publishedAt: true, readingMinutes: true },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const catList = categories.map(c => c.category).filter((c): c is string => !!c)
  const usedCitySlugs = new Set(cityRows.map(c => c.citySlug).filter(Boolean) as string[])
  const cityChips = cities.filter(c => usedCitySlugs.has(c.slug))
  // Cidade ligada pode não ter página publicada: mostra o slug mesmo assim
  for (const slug of Array.from(usedCitySlugs)) if (!cityChips.some(c => c.slug === slug)) cityChips.push({ slug, name: slug })

  // Séries: as fixas primeiro, depois as demais em ordem alfabética
  const seriesMap = new Map<string, typeof seriesRows>()
  for (const r of seriesRows) {
    if (!r.series) continue
    const list = seriesMap.get(r.series) ?? []
    list.push(r)
    seriesMap.set(r.series, list)
  }
  const seriesNames = Array.from(seriesMap.keys()).sort((a, b) => {
    const ia = (FEATURED_SERIES as readonly string[]).indexOf(a); const ib = (FEATURED_SERIES as readonly string[]).indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    return a.localeCompare(b, 'pt-BR')
  }).filter(name => (seriesMap.get(name)?.length ?? 0) >= 2)

  const whatsapp = config?.ownerWhatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP ?? ''
  const waNews = whatsappLink(whatsapp, 'Quero receber as novidades do blog')
  const gridPosts = featured ? posts.filter(p => p.id !== featured.id) : posts
  const chipBase = 'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap'
  const chipOn = 'bg-[#1e3a8a] border-[#1e3a8a] text-white'
  const chipOff = 'bg-white border-gray-200 text-gray-700 hover:border-[#2563eb] hover:text-[#1e3a8a]'

  return (
    <>
      {/* Capa */}
      <section className="bg-[#1e3a8a] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#93c5fd]">Blog</p>
          <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-4xl font-bold sm:text-5xl">Mercado imobiliário do DF</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
                Guias para comprar, vender e alugar com segurança, análises do mercado e novidades das cidades do Distrito Federal.
              </p>
            </div>
            <a href="/blog/rss.xml" className="inline-flex items-center gap-2 text-sm text-[#93c5fd] hover:text-white flex-shrink-0" aria-label="Feed RSS do blog">
              <Rss className="w-4 h-4" /> RSS
            </a>
          </div>

          {featured && (
            <Link
              href={`/blog/${featured.slug}`}
              className="group mt-10 grid gap-6 md:grid-cols-[1.2fr_1fr] items-center rounded-3xl bg-white/5 border border-white/10 p-4 md:p-6 hover:bg-white/10 transition-colors"
              aria-label={`Post em destaque: ${featured.title}`}
            >
              <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-[#172554]">
                {featured.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={featured.coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : <div className="w-full h-full flex items-center justify-center font-display text-5xl font-bold text-white/10">PP</div>}
              </div>
              <div className="min-w-0">
                <p className="text-[#fdba74] uppercase tracking-wide text-xs font-semibold">Em destaque{featured.category ? ` · ${featured.category}` : ''}</p>
                <h2 className="mt-2 font-display text-2xl md:text-3xl font-bold leading-tight break-words">{featured.title}</h2>
                {featured.excerpt && <p className="mt-3 text-slate-200 line-clamp-3 break-words">{featured.excerpt}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <span className="flex items-center gap-2"><AuthorAvatar author={featured.author} /> {featured.author.name}</span>
                  {featured.publishedAt && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatBlogDate(featured.publishedAt)}</span>}
                  {featured.readingMinutes ? <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {featured.readingMinutes} min</span> : null}
                </div>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white group-hover:gap-3 transition-all">Ler o artigo <ArrowRight className="w-4 h-4" /></span>
              </div>
            </Link>
          )}
        </div>
      </section>

      <div className="bg-[#f6f7fb] py-10 md:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 min-w-0">
          {/* Filtros */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 md:p-5 space-y-4">
            <form method="GET" action="/blog" className="flex gap-2">
              {categoria && <input type="hidden" name="categoria" value={categoria} />}
              {cidade && <input type="hidden" name="cidade" value={cidade} />}
              <label htmlFor="blog-busca" className="sr-only">Buscar no blog</label>
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input id="blog-busca" name="busca" defaultValue={busca} placeholder="Buscar no blog..." className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]" />
              </div>
              <button type="submit" className="border border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#eff6ff] rounded-lg px-4 py-2 text-sm font-medium">Buscar</button>
            </form>

            {catList.length > 0 && (
              <div>
                <p className="text-[#ea580c] uppercase tracking-wide text-xs font-semibold mb-2">Categorias</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={buildHref(searchParams, { categoria: undefined, page: undefined })} className={`${chipBase} ${!categoria ? chipOn : chipOff}`}>Todas</Link>
                  {catList.map(c => (
                    <Link key={c} href={buildHref(searchParams, { categoria: c, page: undefined })} className={`${chipBase} ${categoria?.toLowerCase() === c.toLowerCase() ? chipOn : chipOff}`}>{c}</Link>
                  ))}
                </div>
              </div>
            )}

            {cityChips.length > 0 && (
              <div>
                <p className="text-[#ea580c] uppercase tracking-wide text-xs font-semibold mb-2">Cidades</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={buildHref(searchParams, { cidade: undefined, page: undefined })} className={`${chipBase} ${!cidade ? chipOn : chipOff}`}>Todas</Link>
                  {cityChips.map(c => (
                    <Link key={c.slug} href={buildHref(searchParams, { cidade: c.slug, page: undefined })} className={`${chipBase} ${cidade === c.slug ? chipOn : chipOff}`}>{c.name}</Link>
                  ))}
                </div>
              </div>
            )}

            {(tag || busca) && (
              <div className="flex flex-wrap gap-2 text-xs">
                {tag && <Link href={buildHref(searchParams, { tag: undefined, page: undefined })} className={`${chipBase} ${chipOn}`}>Tag: {tag} <X className="w-3 h-3" /></Link>}
                {busca && <Link href={buildHref(searchParams, { busca: undefined, page: undefined })} className={`${chipBase} ${chipOn}`}>Busca: {busca} <X className="w-3 h-3" /></Link>}
              </div>
            )}
          </div>

          {/* Grade */}
          <div className="mt-8">
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[#1e3a8a]">{hasFilter ? 'Resultados' : 'Últimos artigos'}</h2>
              <p className="text-sm text-gray-500">{total} artigo{total !== 1 ? 's' : ''}</p>
            </div>
            {gridPosts.length === 0 ? (
              <div className="rounded-2xl bg-white border border-dashed border-gray-200 p-16 text-center">
                <p className="text-gray-400">{hasFilter ? 'Nenhum artigo encontrado com esses filtros.' : 'Nenhum artigo publicado ainda.'}</p>
                {hasFilter && <Link href="/blog" className="mt-3 inline-block text-sm text-[#2563eb] hover:underline">Ver todos os artigos</Link>}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {gridPosts.map(post => <BlogCard key={post.id} post={post} />)}
              </div>
            )}

            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 mt-10 flex-wrap" aria-label="Paginação">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <Link
                    key={p}
                    href={buildHref(searchParams, { page: String(p) })}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${p === page ? 'bg-[#1e3a8a] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#2563eb]'}`}
                    aria-label={`Página ${p}`}
                    aria-current={p === page ? 'page' : undefined}
                  >
                    {p}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Séries */}
          {seriesNames.length > 0 && (
            <section className="mt-14" aria-label="Séries do blog">
              <p className="text-[#ea580c] uppercase tracking-wide text-xs font-semibold">Leia em sequência</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[#1e3a8a] mt-1">Séries</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {seriesNames.map(name => {
                  const list = seriesMap.get(name) ?? []
                  return (
                    <div key={name} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 min-w-0">
                      <h3 className="font-semibold text-lg text-[#1e3a8a] break-words">{name}</h3>
                      <p className="text-xs text-gray-500 mb-3">{list.length} artigos, na ordem</p>
                      <ol className="space-y-2">
                        {list.map((p, i) => (
                          <li key={p.slug} className="flex gap-3 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-[#eff6ff] text-[#1e3a8a] text-xs font-bold flex items-center justify-center flex-shrink-0" aria-hidden="true">{i + 1}</span>
                            <Link href={`/blog/${p.slug}`} className="text-sm text-gray-800 hover:text-[#1e3a8a] hover:underline break-words min-w-0">
                              {p.title}
                              {p.readingMinutes ? <span className="text-gray-400"> · {p.readingMinutes} min</span> : null}
                            </Link>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* WhatsApp */}
          <section className="mt-14 rounded-3xl bg-[#ea580c] text-white p-6 md:p-10 grid gap-6 md:grid-cols-[1fr_auto] items-center">
            <div className="min-w-0">
              <p className="text-white/80 uppercase tracking-wide text-xs font-semibold">Novidades</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold mt-1">Receba novidades no WhatsApp</h2>
              <p className="mt-2 text-white/85 max-w-xl">Novos artigos, oportunidades e análises do mercado do DF direto no seu celular. Sem spam: você sai quando quiser.</p>
            </div>
            <a href={waNews} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-[#1e3a8a] px-6 py-3 text-sm font-semibold hover:bg-[#F7F9FC] transition-colors">
              <MessageCircle className="w-4 h-4" /> Quero receber
            </a>
          </section>
        </div>
      </div>
    </>
  )
}
