export const dynamic = 'force-dynamic'

/**
 * v1.3 — Página pública de uma cidade do DF: capa (com vídeo opcional), breadcrumb, números fixos
 * (RA, fundação, população, área, distância e preço médio do m² dos anúncios), índice lateral,
 * seções do editor e CTA padrão quando a página não tem seção CTA. JSON-LD `Place`.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { absUrl } from '@/lib/site'
import { getSiteConfigCached } from '@/lib/cache'
import { parseSections, type SectionCta } from '@/lib/sections'
import { averageSqmPrice, countActiveProperties } from '@/lib/section-data'
import { CtaBlock, SectionIndex, SectionRenderer, VideoEmbed } from '@/components/public/SectionRenderer'
import { AreaInsightBlock } from '@/components/public/AreaInsightBlock'

interface Props { params: { slug: string } }

async function getCity(slug: string) {
  return prisma.cityPage.findUnique({ where: { slug } })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = await getCity(params.slug)
  if (!city || city.status !== 'PUBLISHED') return { title: 'Cidade não encontrada' }
  const title = city.seoTitle || `${city.name}: história, números e imóveis`
  const description = city.seoDescription || city.summary?.slice(0, 160) || `Guia de ${city.name} (DF): história, números, locais para visitar e imóveis à venda e para alugar.`
  const og = absUrl(city.ogImageUrl || city.coverUrl)
  return {
    title,
    description,
    alternates: { canonical: absUrl(`/cidades/${city.slug}`) },
    openGraph: { title: `${title} | Paulo Pop`, description, url: absUrl(`/cidades/${city.slug}`), type: 'article', ...(og ? { images: [{ url: og }] } : {}) },
  }
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export default async function CidadePage({ params }: Props) {
  const city = await getCity(params.slug)
  if (!city || city.status !== 'PUBLISHED') notFound()

  const names = city.matchNames.length ? city.matchNames : [city.name]
  const [config, avgM2, total] = await Promise.all([getSiteConfigCached().catch(() => null), averageSqmPrice(names), countActiveProperties(names)])
  const whatsapp = config?.ownerWhatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP ?? ''
  const sections = parseSections(city.sections)
  const hasCta = sections.some(s => s.type === 'cta' && s.visible !== false)

  const facts = [
    city.raNumber && { label: 'Região Administrativa', value: city.raNumber },
    city.foundedAt && { label: 'Fundação', value: city.foundedAt },
    city.population && { label: 'População', value: city.population, source: city.populationSource },
    city.areaKm2 && { label: 'Área', value: `${city.areaKm2} km²` },
    city.distanceKm && { label: 'Distância ao Plano Piloto', value: `${city.distanceKm} km` },
    avgM2 && { label: 'Preço médio do m² (anúncios)', value: `${brl(avgM2)}/m²`, source: 'anúncios ativos deste site' },
    total > 0 && { label: 'Imóveis disponíveis', value: String(total) },
  ].filter((f): f is { label: string; value: string; source?: string | null } => !!f)

  const defaultCta: SectionCta = {
    id: 'cta-padrao', type: 'cta', title: `Quer vender ou alugar seu imóvel em ${city.name}?`,
    text: `Avaliação gratuita com quem conhece ${city.name} e vende imóveis por aqui todos os meses.`,
    buttonLabel: 'Falar no WhatsApp', whatsappMessage: `Olá! Quero vender ou alugar meu imóvel em ${city.name}.`, showForm: true, style: 'orange',
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: city.name,
    url: absUrl(`/cidades/${city.slug}`),
    ...(city.summary ? { description: city.summary } : {}),
    ...(city.coverUrl ? { image: absUrl(city.coverUrl) } : {}),
    address: { '@type': 'PostalAddress', addressLocality: city.name, addressRegion: 'DF', addressCountry: 'BR' },
    ...(city.latitude != null && city.longitude != null ? { geo: { '@type': 'GeoCoordinates', latitude: city.latitude, longitude: city.longitude } } : {}),
    containedInPlace: { '@type': 'AdministrativeArea', name: 'Distrito Federal' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Capa */}
      <section className="relative bg-[#1e3a8a] text-white overflow-hidden">
        {city.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={city.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#172554] via-[#1e3a8a]/70 to-transparent" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-300 flex items-center gap-1 flex-wrap">
            <Link href="/" className="hover:text-white">Início</Link><ChevronRight className="w-3 h-3" />
            <Link href="/cidades" className="hover:text-white">Cidades do DF</Link><ChevronRight className="w-3 h-3" />
            <span className="text-white">{city.name}</span>
          </nav>
          <div className={`mt-6 grid gap-8 ${city.videoUrl ? 'lg:grid-cols-[1fr_420px] items-end' : ''}`}>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#93c5fd]">Cidade do Distrito Federal</p>
              <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl break-words">{city.name}</h1>
              {city.tagline && <p className="mt-3 text-xl text-[#fdba74] font-medium">{city.tagline}</p>}
              {city.summary && <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 break-words">{city.summary}</p>}
            </div>
            {city.videoUrl && <VideoEmbed url={city.videoUrl} title={`Vídeo de ${city.name}`} />}
          </div>
        </div>
      </section>

      {/* Números fixos */}
      {facts.length > 0 && (
        <section className="bg-white border-b border-gray-100" aria-label={`${city.name} em números`}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <dl className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {facts.map(f => (
                <div key={f.label} className="min-w-0">
                  <dt className="text-[11px] uppercase tracking-wide text-gray-500">{f.label}</dt>
                  <dd className="mt-0.5 font-display text-lg font-bold text-[#1e3a8a] break-words">{f.value}</dd>
                  {f.source && <p className="text-[10px] text-gray-400 truncate">Fonte: {f.source}</p>}
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <div className="bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex gap-10 min-w-0">
            <SectionIndex sections={sections} />
            <div className="min-w-0 flex-1 space-y-14">
              <SectionRenderer sections={sections} context={{ cityNames: names, whatsapp, pageName: city.name }} />
              <AreaInsightBlock kind="city" id={city.id} />
              {!hasCta && (
                <section id="vender" className="scroll-mt-32">
                  <CtaBlock s={defaultCta} ctx={{ cityNames: names, whatsapp, pageName: city.name }} />
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
