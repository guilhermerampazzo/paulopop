export const dynamic = 'force-dynamic'

/**
 * Home — v1.3: busca grande (campo único + abas + regiões), bloco "Quer vender?", números,
 * vitrine unificada com filtros rápidos, empreendimentos, regiões, como funciona, depoimentos,
 * últimos posts e contato. Título/subtítulo/imagem do hero continuam vindo do painel.
 */
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Building2, MapPin, MessageCircle, Phone, Send, Calendar, ClipboardCheck, ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/site'
import { unstable_cache } from 'next/cache'
import { getSiteConfigCached, getActiveCitiesCached, TAGS } from '@/lib/cache'
import { getPublishedCityLinksCached } from '@/lib/city-pages'
import { CARD_SELECT, toCard } from '@/lib/section-data'
import { HomeSearch } from '@/components/public/HomeSearch'
import { HomeShowcase } from '@/components/public/HomeShowcase'
import { HomeEmpreendimentos, HomeRegions, HomeStats, HomeHowItWorks, EYEBROW, H2 } from '@/components/public/HomeSections'
import { PropertyCarousel } from '@/components/public/PropertyCarousel'
import { ContactForm } from '@/components/public/ContactForm'
import { GoogleReviews } from '@/components/public/GoogleReviews'
import { Testimonials } from '@/components/public/Testimonials'

export const metadata: Metadata = {
  title: { absolute: 'Paulo Pop | Corretor de Imóveis no DF' },
  alternates: { canonical: '/' },
  description: 'Corretor de imóveis RE/MAX no DF: apartamentos e casas em Samambaia, Taguatinga e Águas Claras, com avaliação gratuita do seu imóvel.',
}

// v1.1: telefones completos e clicáveis
function formatPhone(value: string | null | undefined): string {
  if (!value) return ''
  const d = value.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return value
}
function waLink(value: string): string {
  const d = value.replace(/\D/g, '')
  return `https://wa.me/${d.length <= 11 ? '55' + d : d}`
}
function telLink(value: string): string {
  const d = value.replace(/\D/g, '')
  return `tel:+${d.length <= 11 ? '55' + d : d}`
}

// v1.1/v1.3: consultas da home em cache de 60 s (renovadas ao salvar no painel)
const getHomeData = unstable_cache(
  async () => {
    const now = new Date()
    const [recent, soldRows, blogPosts, activeCount] = await Promise.all([
      prisma.property.findMany({
        where: { status: 'ACTIVE', hideOnSite: false },
        orderBy: { createdAt: 'desc' },
        take: 24,
        select: CARD_SELECT,
      }),
      // v1.1: vendidos e alugados recentemente (prova de resultado)
      prisma.property.findMany({
        where: { status: { in: ['SOLD', 'RENTED'] }, hideOnSite: false },
        orderBy: [{ soldAt: 'desc' }, { updatedAt: 'desc' }],
        take: 8,
        select: CARD_SELECT,
      }),
      // v1.3: só publicados com data de publicação já passada (agendados ficam de fora)
      prisma.blogPost.findMany({
        where: { status: 'PUBLISHED', OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
        orderBy: { publishedAt: 'desc' },
        take: 3,
        select: { slug: true, title: true, excerpt: true, coverUrl: true, category: true, publishedAt: true, readingMinutes: true },
      }),
      prisma.property.count({ where: { status: 'ACTIVE', hideOnSite: false } }),
    ])
    return { properties: recent.map(toCard), sold: soldRows.map(p => ({ ...toCard(p), isNew: false })), blogPosts, activeCount }
  },
  ['home-data-v13'],
  { revalidate: 60, tags: [TAGS.properties, TAGS.blog] }
)

export default async function HomePage() {
  const [config, homeData, activeCities, cityLinks] = await Promise.all([
    getSiteConfigCached(),
    getHomeData(),
    getActiveCitiesCached().catch(() => [] as string[]),
    getPublishedCityLinksCached().catch(() => []),
  ])
  const properties = homeData.properties
  const soldProperties = homeData.sold
  const blogPosts = homeData.blogPosts.map(p => ({ ...p, publishedAt: p.publishedAt ? new Date(p.publishedAt) : null }))

  const ownerPhoto = config?.ownerPhotoUrl
  const ownerName = config?.ownerName ?? 'Paulo Pop'
  const ownerCreci = config?.ownerCreci
  const ownerCompany = config?.ownerCompany
  const whatsapp = config?.ownerWhatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP ?? ''
  const heroTitle = config?.heroTitle ?? `Encontre o próximo imóvel com a consultoria de ${ownerName}`
  const heroSubtitle = config?.heroSubtitle ?? 'Compra, venda e locação em Samambaia, Taguatinga e Águas Claras, com critério, contexto e agilidade.'

  // chips de região: cidades publicadas primeiro, depois as cidades com anúncios ativos
  const regions = Array.from(new Set([...cityLinks.map(c => c.name), ...activeCities])).slice(0, 8)

  const hideChips: Array<'apartamentos' | 'casas'> = []
  if (config?.showApartamentos === false) hideChips.push('apartamentos')
  if (config?.showCasas === false) hideChips.push('casas')

  const realEstateAgentJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: ownerName,
    url: SITE_URL,
    ...(ownerPhoto ? { image: ownerPhoto } : {}),
    ...(config?.ownerPhone ? { telephone: config.ownerPhone } : {}),
    ...(config?.ownerEmail ? { email: config.ownerEmail } : {}),
    ...(ownerCreci ? { identifier: { '@type': 'PropertyValue', name: 'CRECI', value: ownerCreci } } : {}),
    ...(config?.ownerAddress ? { address: { '@type': 'PostalAddress', streetAddress: config.ownerAddress, addressRegion: 'DF', addressCountry: 'BR' } } : {}),
    ...(config?.logoUrl ? { logo: config.logoUrl } : {}),
    ...(ownerCompany ? { worksFor: { '@type': 'Organization', name: ownerCompany } } : {}),
    sameAs: [config?.ownerInstagram, config?.ownerFacebook, config?.ownerLinkedin, config?.ownerYoutube, config?.ownerTwitter].filter(Boolean),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(realEstateAgentJsonLd) }} />

      {/* ─── Hero com busca grande ─── */}
      <section className="relative overflow-hidden bg-[#07172f] text-white" aria-label="Hero">
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background: config?.heroBgUrl
              ? undefined
              : 'radial-gradient(circle at 15% 20%, rgba(91,164,245,0.32), transparent 30%), linear-gradient(135deg, #07172f 0%, #1e3a8a 55%, #1d4ed8 100%)',
          }}
        />
        {config?.heroBgUrl && (
          <Image src={config.heroBgUrl} alt="" aria-hidden="true" fill priority sizes="100vw" className="object-cover" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,23,47,0.92)_8%,rgba(7,23,47,0.76)_45%,rgba(7,23,47,0.88)_100%)]" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-28 sm:px-6 md:pb-20 md:pt-36 lg:px-8">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.3fr)_340px]">
            <div className="max-w-3xl min-w-0">
              <h1 className="font-display text-4xl font-bold leading-[1.02] text-white sm:text-5xl xl:text-6xl">{heroTitle}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">{heroSubtitle}</p>
              <div className="mt-8">
                <HomeSearch regions={regions} />
              </div>
            </div>

            {/* Quer vender? Avaliação grátis */}
            <aside className="rounded-[28px] border border-white/12 bg-white/10 p-6 backdrop-blur-xl" aria-labelledby="vender-title">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[20px] bg-white/10">
                  {ownerPhoto ? (
                    <Image src={ownerPhoto} alt={ownerName} fill sizes="64px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><Building2 className="h-7 w-7 text-white/60" /></div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#93c5fd]">Proprietário</p>
                  <h2 id="vender-title" className="mt-1 font-display text-2xl font-bold text-white leading-tight">Quer vender? Avaliação grátis</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-200">
                Descubra quanto vale o seu imóvel com um estudo de mercado feito por {ownerName}{ownerCompany ? `, ${ownerCompany}` : ''}, sem compromisso.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                <li className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-[#93c5fd]" /> Preço com base em imóveis comparáveis</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#93c5fd]" /> Anúncio na rede RE/MAX e nos portais</li>
              </ul>
              <Link href="/vender" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ea580c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c2410c]">
                Pedir avaliação gratuita <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-300">
                {ownerCreci && <p>CRECI {ownerCreci}</p>}
                {whatsapp && <p className="mt-1">WhatsApp: <a href={waLink(whatsapp)} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{formatPhone(whatsapp)}</a></p>}
              </div>
            </aside>
          </div>

          {/* Números */}
          <div className="mt-10">
            <HomeStats activeCount={homeData.activeCount} />
          </div>
        </div>
      </section>

      {/* ─── Vitrine unificada ─── */}
      {(config?.showDestaques ?? true) && properties.length > 0 && (
        <section className="bg-[#f6f7fb] py-16 md:py-20" aria-labelledby="vitrine-title">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className={EYEBROW}>Imóveis</p>
              <h2 id="vitrine-title" className={H2}>Oportunidades selecionadas</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">Os anúncios mais recentes, com preço por m², código e fotos. Filtre pelo que interessa.</p>
            </div>
            <HomeShowcase items={properties} whatsapp={whatsapp} hideChips={hideChips} />
          </div>
        </section>
      )}

      {/* ─── Vendidos ─── */}
      {soldProperties.length > 0 && (
        <section className="bg-white py-16 md:py-20" aria-labelledby="vendidos-title">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className={EYEBROW}>Resultados</p>
                <h2 id="vendidos-title" className={H2}>Vendidos e alugados recentemente</h2>
                <p className="mt-3 text-base leading-7 text-slate-600">Imóveis que passaram por aqui e já têm novo dono ou novo morador: tempo de venda real, sem promessa.</p>
              </div>
              <Link href="/vender" className="inline-flex items-center gap-2 self-start rounded-full border border-[#1e3a8a]/10 bg-white px-5 py-3 text-sm font-semibold text-[#1e3a8a] transition hover:border-[#2563eb] hover:text-[#2563eb]">
                Quero vender o meu <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <PropertyCarousel properties={soldProperties} />
          </div>
        </section>
      )}

      {/* ─── Empreendimentos e Regiões ─── */}
      <HomeEmpreendimentos />
      <HomeRegions />

      {/* ─── Como funciona ─── */}
      <HomeHowItWorks />

      {/* ─── Depoimentos e avaliações ─── */}
      <Testimonials className="bg-white py-16 md:py-20" />
      <section className="bg-white pb-16 md:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <GoogleReviews />
        </div>
      </section>

      {/* ─── Sobre (resumo) ─── */}
      <section className="bg-[#f6f7fb] py-16 md:py-20" id="sobre" aria-labelledby="sobre-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_480px] items-center">
            <div>
              <p className={EYEBROW}>Sobre</p>
              <h2 id="sobre-title" className={`${H2} max-w-xl`}>Atendimento humano, leitura de mercado e acompanhamento real</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                Cada cliente chega com uma urgência, um objetivo e um nível de clareza diferente. O trabalho aqui é transformar isso em uma busca mais bem orientada e uma negociação mais segura.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/sobre" className="inline-flex items-center gap-2 rounded-full bg-[#1e3a8a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#172554]">
                  Ver perfil completo <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/imoveis" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#2563eb] hover:text-[#1e3a8a]">
                  Explorar portfólio
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-42px_rgba(8,30,63,0.45)]">
              <div className="relative h-56 overflow-hidden rounded-[22px] bg-[#dbeafe]">
                {ownerPhoto ? (
                  <Image src={ownerPhoto} alt={ownerName} fill loading="lazy" sizes="(max-width: 1024px) 100vw, 480px" className="object-cover object-top" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><Building2 className="h-20 w-20 text-slate-300" /></div>
                )}
              </div>
              <div className="mt-5">
                <h3 className="font-display text-2xl font-bold text-[#1e3a8a]">{ownerName}</h3>
                {ownerCompany && <p className="mt-1 text-sm text-slate-500">{ownerCompany}</p>}
                {ownerCreci && <p className="mt-2 text-sm font-medium text-slate-700">CRECI {ownerCreci}</p>}
                {whatsapp && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <MessageCircle className="h-4 w-4 text-[#25D366]" />
                    <a href={waLink(whatsapp)} target="_blank" rel="noopener noreferrer" className="hover:underline">{formatPhone(whatsapp)}</a>
                  </p>
                )}
                {config?.ownerPhone && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-[#1e3a8a]" />
                    <a href={telLink(config.ownerPhone)} className="hover:underline">{formatPhone(config.ownerPhone)}</a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Blog ─── */}
      {blogPosts.length > 0 && (
        <section className="bg-white py-16 md:py-20" aria-labelledby="blog-title">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className={EYEBROW}>Blog</p>
                <h2 id="blog-title" className={H2}>Artigos e dicas do mercado</h2>
                <p className="mt-3 text-base leading-7 text-slate-600">Informação para quem quer tomar decisões melhores na compra, venda ou aluguel.</p>
              </div>
              <Link href="/blog" className="inline-flex items-center gap-2 self-start rounded-full border border-[#1e3a8a]/10 bg-white px-5 py-3 text-sm font-semibold text-[#1e3a8a] transition hover:border-[#2563eb] hover:text-[#2563eb]">
                Ver todos os artigos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map(post => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_4px_24px_-8px_rgba(8,30,63,0.12)] transition-all hover:border-[#2563eb]/30 hover:shadow-[0_8px_32px_-8px_rgba(8,30,63,0.2)]" aria-label={`Ler: ${post.title}`}>
                  <div className="relative aspect-[16/9] overflow-hidden bg-[#dbeafe]">
                    {post.coverUrl ? (
                      <Image src={post.coverUrl} alt={post.title} fill loading="lazy" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><span className="font-display text-4xl font-bold text-[#1e3a8a]/20">PP</span></div>
                    )}
                  </div>
                  <div className="p-6">
                    {post.category && <span className="mb-3 inline-block rounded-full bg-[#eff6ff] px-2.5 py-0.5 text-xs font-medium text-[#1e3a8a]">{post.category}</span>}
                    <h3 className="line-clamp-2 font-semibold text-gray-900 transition-colors group-hover:text-[#1e3a8a]">{post.title}</h3>
                    {post.excerpt && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{post.excerpt}</p>}
                    <div className="mt-4 flex items-center justify-between">
                      {post.publishedAt && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Calendar className="h-3 w-3" />
                          {post.publishedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {post.readingMinutes ? ` · ${post.readingMinutes} min` : ''}
                        </span>
                      )}
                      <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] transition-all group-hover:gap-2">Ler <ArrowRight className="h-3 w-3" /></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Contato ─── */}
      <section className="bg-[#1e3a8a] py-16 md:py-20 text-white" aria-labelledby="contato-title">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#93c5fd]">Contato</p>
            <h2 id="contato-title" className="mt-3 max-w-md font-display text-3xl md:text-4xl font-bold">Fale sobre o imóvel que você quer encontrar</h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-slate-200">
              Se a ideia for comprar, vender ou alugar, a conversa pode começar por aqui. Eu retorno com orientação e próximos passos.
            </p>
            {config?.ownerAddress && (
              <p className="mt-6 flex items-center gap-2 text-sm text-slate-200"><MapPin className="h-4 w-4 text-[#93c5fd]" />{config.ownerAddress}</p>
            )}
          </div>
          <div className="min-w-0 rounded-[32px] bg-white p-6 text-slate-900 shadow-[0_30px_80px_-50px_rgba(4,13,31,1)]">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-[#2563eb]" />
              <h3 className="font-display text-2xl font-bold text-[#1e3a8a]">Contate-me</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">Envie sua mensagem e eu retorno com orientação personalizada.</p>
            <div className="mt-6">
              <ContactForm whatsapp={whatsapp} whatsappMessage={config?.whatsappMessage ?? undefined} />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
