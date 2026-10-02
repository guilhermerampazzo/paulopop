export const dynamic = 'force-dynamic'

/**
 * Página do imóvel — v1.3: galeria com abas e grupos por cômodo, barra de resumo fixa,
 * simulador "Quanto custa por mês", preço/m² comparado, características agrupadas,
 * histórico de preço, alerta de redução, impressão, "Viver aqui", parceiros e redirect 301 de slugs antigos.
 * v1.4: hub do corretor padronizado (AgentCard), condição do imóvel visível, preço/m² com faixa de
 * tolerância e referência editável por imóvel, compartilhar com a foto principal e ficha completa para imprimir.
 */
import { cleanPageTitle, TITLE_SUFFIX } from '@/lib/seo-title'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { absUrl } from '@/lib/site'
import { formatCurrency, formatArea } from '@/lib/formatters'
import { CARD_SELECT, toCard } from '@/lib/section-data'
import { parsePriceHistory, priceReductions } from '@/lib/price-history'
import { groupFeatures } from '@/lib/property-features'
import { compareSqm } from '@/lib/property-compare'
import { sqmPublicView } from '@/lib/sqm-display'
import { agentDisplay, ownerFallback } from '@/lib/agent-display'
import { AgentCard } from '@/components/public/AgentCard'
import { PropertyGallery } from '@/components/public/PropertyGallery'
import { PropertySummaryBar } from '@/components/public/PropertySummaryBar'
import { FinanceSimulator } from '@/components/public/FinanceSimulator'
import { FeatureGroups } from '@/components/public/FeatureGroups'
import { PriceDropAlert } from '@/components/public/PriceDropAlert'
import { ContactForm } from '@/components/public/ContactForm'
import { GoogleReviews } from '@/components/public/GoogleReviews'
import { PropertyCarousel } from '@/components/public/PropertyCarousel'
import { ViewCounter } from '@/components/public/ViewCounter'
import { PartnersStrip } from '@/components/public/PartnersStrip'
import { MapEmbed } from '@/components/public/MapEmbed'
import DescriptionExpander from '@/components/public/DescriptionExpander'
import { AreaInsightBlock } from '@/components/public/AreaInsightBlock'
import {
  MapPin, Bed, Bath, LayoutGrid, Maximize2, Car, Building2,
  ChevronRight, FileText, Download, Globe, Layers, CalendarDays, TrendingDown, BarChart3, Tag, BadgeCheck, Printer,
} from 'lucide-react'

interface Props {
  params: { slug: string }
}

const transactionLabel: Record<string, string> = { SALE: 'Venda', RENT: 'Aluguel' }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const property = await prisma.property.findUnique({
    where: { slug: params.slug, status: 'ACTIVE', hideOnSite: false },
    select: {
      id: true, title: true, propertyType: true, transactionType: true, city: true, neighborhood: true, state: true, price: true, totalArea: true,
      description: true, marketingDescription: true,
      images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 1, select: { url: true } },
    },
  })

  if (!property) return { title: 'Imóvel não encontrado' }

  // v1.5: sem sufixo repetido ("| Paulo Pop | Paulo Pop") e com tamanho que o Google mostra inteiro
  const title = cleanPageTitle(property.title
    || [property.propertyType, transactionLabel[property.transactionType], [property.neighborhood, property.city].filter(Boolean).join(', ')].filter(Boolean).join(' - '))

  const description = property.marketingDescription
    ?? property.description?.substring(0, 160)
    ?? `${property.propertyType} para ${transactionLabel[property.transactionType].toLowerCase()} em ${property.city}, ${property.state}.`

  return {
    title,
    description,
    alternates: { canonical: `/imoveis/${params.slug}` },
    // v1.4: a foto principal vai na prévia do link (WhatsApp, Facebook, Telegram), em 1200×630 e endereço absoluto
    openGraph: {
      title: `${title}${TITLE_SUFFIX}`,
      description,
      url: absUrl(`/imoveis/${params.slug}`),
      images: property.images[0] ? [{ url: absUrl(`/api/og/imovel/${property.id}`)!, width: 1200, height: 630, alt: title }] : [],
      type: 'website',
      locale: 'pt_BR',
    },
    twitter: property.images[0] ? { card: 'summary_large_image', title, description, images: [absUrl(`/api/og/imovel/${property.id}`)!] } : undefined,
  }
}

const DAY = 86_400_000

export default async function PropertyPage({ params }: Props) {
  const [property, config] = await Promise.all([
    prisma.property.findUnique({
      where: { slug: params.slug, status: 'ACTIVE', hideOnSite: false },
      include: {
        images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
        features: true,
        lifestyles: true,
        documents: { where: { isPublic: true } },
        videos: true,
        agent: { select: { name: true, publicName: true, avatarUrl: true, company: true, companyRole: true, creci: true, phone: true, whatsapp: true, role: true, email: true } },
        empreendimento: { select: { id: true, name: true, slug: true, stage: true, status: true, builder: true, deliveryYear: true } },
        unit: { select: { number: true, floor: true, block: { select: { name: true } }, unitType: { select: { name: true } } } },
      },
    }),
    prisma.siteConfig.findFirst(),
  ])

  if (!property) {
    // v1.3: slug antigo → redirect 301 para o slug atual
    const moved = await prisma.property.findFirst({
      where: { previousSlugs: { has: params.slug }, status: 'ACTIVE', hideOnSite: false },
      select: { slug: true },
    })
    if (moved) permanentRedirect(`/imoveis/${moved.slug}`)
    notFound()
  }

  const price = property.price ? Number(property.price) : null
  const usefulArea = property.usefulArea ? Number(property.usefulArea) : null
  const totalArea = property.totalArea ? Number(property.totalArea) : null

  // Semelhantes, vendidos e comparação de preço/m² em paralelo
  const [similarRows, soldRows, sqm] = await Promise.all([
    prisma.property.findMany({
      where: { status: 'ACTIVE', hideOnSite: false, id: { not: property.id }, transactionType: property.transactionType, city: property.city ?? undefined },
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: CARD_SELECT,
    }),
    prisma.property.findMany({
      where: { status: { in: ['SOLD', 'RENTED'] }, hideOnSite: false, id: { not: property.id }, city: property.city ?? undefined },
      take: 6,
      orderBy: [{ soldAt: 'desc' }, { updatedAt: 'desc' }],
      select: CARD_SELECT,
    }),
    compareSqm({
      id: property.id, price, usefulArea, totalArea, transactionType: property.transactionType,
      city: property.city, neighborhood: property.neighborhood, empreendimentoId: property.empreendimentoId,
    }).catch(() => null),
  ])
  // v1.4: o que o público vê do preço/m² (faixa de tolerância; referência automática ou do corretor)
  const sqmView = sqmPublicView({
    own: sqm?.own ?? null,
    mode: property.sqmCompareMode,
    auto: sqm ? { region: sqm.region, building: sqm.building && property.empreendimento ? { ...sqm.building, label: property.empreendimento.name } : null } : null,
    manual: { value: property.sqmRefValue ? Number(property.sqmRefValue) : null, label: property.sqmRefLabel },
  })
  const similar = similarRows.map(toCard)
  const soldSimilar = soldRows.map(p => ({ ...toCard(p), isNew: false }))

  const title = property.title
    ?? `${property.propertyType} — ${transactionLabel[property.transactionType]} — ${property.city}, ${property.state}`

  // Título no padrão RE/MAX: "Apartamento - Venda - Samambaia, DF"
  const place = [property.city, property.state].filter(Boolean).join(', ')
  const headline = property.propertyType
    ? [property.propertyType, transactionLabel[property.transactionType], place].filter(Boolean).join(' - ')
    : title

  const fullAddress = property.showFullAddress
    ? [property.address, property.number, property.complement, property.neighborhood, property.city, property.state, property.zipCode].filter(Boolean).join(', ')
    : [property.neighborhood, property.city, property.state].filter(Boolean).join(', ')

  const periodLabel = (p: string | null) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : null)
  const condoFee = property.condominiumFee && Number(property.condominiumFee) > 0 ? Number(property.condominiumFee) : null
  const iptu = property.iptu && Number(property.iptu) > 0 ? Number(property.iptu) : null
  const costRows = [
    condoFee ? { label: 'Condomínio', value: formatCurrency(condoFee), suffix: periodLabel(property.condominiumFeePeriod) } : null,
    iptu ? { label: 'IPTU', value: formatCurrency(iptu), suffix: periodLabel(property.iptuPeriod) } : null,
    property.availabilityDate ? { label: 'Disponível a partir de', value: property.availabilityDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' }), suffix: null } : null,
  ].filter((r): r is { label: string; value: string; suffix: string | null } => r !== null)

  // Ficha do imóvel
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v))
  const fichaRows: { label: string; value: string }[] = []
  const addFicha = (label: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '' || value === 0) return
    fichaRows.push({ label, value: String(value) })
  }
  addFicha('Ambientes totais', property.environments)
  addFicha('Dormitórios', property.bedrooms)
  addFicha('Suítes', property.suites)
  addFicha('Varandas', property.balconies)
  addFicha('Banheiros', property.bathrooms)
  addFicha('Vagas', property.totalParkingSpots)
  addFicha('Área total', n(property.totalArea) ? formatArea(Number(property.totalArea)) : null)
  addFicha('Área útil', n(property.usefulArea) ? formatArea(Number(property.usefulArea)) : null)
  addFicha('Área do terreno', n(property.landArea) ? formatArea(Number(property.landArea)) : null)
  addFicha('Ano/mês de construção', property.constructionYear
    ? `${property.constructionYear}${property.constructionMonth ? `/${String(property.constructionMonth).padStart(2, '0')}` : ''}`
    : null)
  addFicha('Número de pisos', property.floors)
  addFicha('Andar', property.floor)
  addFicha('Uso do terreno', property.landUse)
  addFicha('Categoria', property.category)
  addFicha('Condição', property.condition)

  const featureGroups = groupFeatures({
    features: property.features.map(f => f.feature),
    extraFeatures: property.extraFeatures,
    lifestyles: property.lifestyles.map(l => l.lifestyle),
  })

  // v1.3: publicação e histórico de preço
  const publishedAt = property.publishedAt ?? property.createdAt
  const daysOnSite = Math.max(0, Math.floor((Date.now() - publishedAt.getTime()) / DAY))
  const history = parsePriceHistory(property.priceHistory)
  const reductions = priceReductions(property.priceHistory)
  const lastReduction = reductions[0] ?? null

  // Links relacionados
  const relatedLinks: { href: string; label: string }[] = []
  const cityParam = property.city ? encodeURIComponent(property.city) : null
  if (property.propertyType) relatedLinks.push({ href: `/imoveis?tipo=${encodeURIComponent(property.propertyType)}`, label: `Veja mais imóveis do tipo ${property.propertyType}` })
  if (price && cityParam) {
    const min = Math.round(price * 0.75), max = Math.round(price * 1.25)
    relatedLinks.push({ href: `/imoveis?cidade=${cityParam}&precoMin=${min}&precoMax=${max}`, label: `Entre ${formatCurrency(min)} e ${formatCurrency(max)} em ${property.city}` })
  }
  if (property.neighborhood) relatedLinks.push({ href: `/imoveis?busca=${encodeURIComponent(property.neighborhood)}`, label: `Imóveis em ${property.neighborhood}` })
  if (cityParam) {
    relatedLinks.push({ href: `/imoveis?cidade=${cityParam}&transacao=comprar`, label: `Venda em ${property.city}` })
    relatedLinks.push({ href: `/imoveis?cidade=${cityParam}&transacao=alugar`, label: `Alugar em ${property.city}` })
  }

  const breadcrumb = [
    { label: 'Imóveis', href: '/imoveis' },
    ...(property.propertyType ? [{ label: property.propertyType, href: `/imoveis?tipo=${encodeURIComponent(property.propertyType)}` }] : []),
    ...(property.neighborhood ? [{ label: property.neighborhood, href: `/imoveis?busca=${encodeURIComponent(property.neighborhood)}` }] : []),
  ]

  const agentWhatsapp = property.agent.whatsapp ?? config?.ownerWhatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP ?? ''
  const agentName = property.agent.name
  const agentCompany = property.agent.company ?? config?.ownerCompany ?? ''
  // v1.4: hub do corretor (mesmo formato em todo o site)
  const agentCard = agentDisplay(property.agent, ownerFallback(property.agent, config)) // v1.5: Meu perfil incompleto → Configurações
  const hasCover = property.images.length > 0
  const pageUrl = absUrl(`/imoveis/${property.slug}`)!

  // JSON-LD: RealEstateListing + Offer (v1.3)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: title,
    description: property.marketingDescription ?? property.description ?? undefined,
    url: pageUrl,
    datePosted: publishedAt.toISOString(),
    image: property.images.slice(0, 5).map(i => i.url),
    offers: price && !property.hidePrice ? {
      '@type': 'Offer',
      price,
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url: pageUrl,
      businessFunction: property.transactionType === 'RENT' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell',
      seller: { '@type': 'RealEstateAgent', name: agentName, ...(agentCompany ? { worksFor: { '@type': 'Organization', name: agentCompany } } : {}) },
    } : undefined,
    mainEntity: {
      '@type': property.transactionType === 'RENT' ? 'Accommodation' : (property.propertyType && /casa|sobrado/i.test(property.propertyType) ? 'House' : 'Apartment'),
      name: title,
      address: {
        '@type': 'PostalAddress',
        streetAddress: property.showFullAddress ? property.address ?? undefined : undefined,
        addressLocality: property.city ?? undefined,
        addressRegion: property.state ?? undefined,
        postalCode: property.zipCode ?? undefined,
        addressCountry: 'BR',
      },
      numberOfRooms: property.bedrooms ?? undefined,
      numberOfBathroomsTotal: property.bathrooms ?? undefined,
      floorSize: totalArea ? { '@type': 'QuantitativeValue', value: totalArea, unitCode: 'MTK' } : undefined,
      ...(property.latitude && property.longitude ? { geo: { '@type': 'GeoCoordinates', latitude: Number(property.latitude), longitude: Number(property.longitude) } } : {}),
    },
  }

  const keyFacts: Array<{ icon: React.ReactNode; value: string; label: string }> = []
  if (totalArea) keyFacts.push({ icon: <Maximize2 className="w-5 h-5 text-[#2563eb]" />, value: formatArea(totalArea), label: 'Área total' })
  if (usefulArea) keyFacts.push({ icon: <Maximize2 className="w-5 h-5 text-[#2563eb]" />, value: formatArea(usefulArea), label: 'Área útil' })
  if ((property.bedrooms ?? 0) > 0) keyFacts.push({ icon: <Bed className="w-5 h-5 text-[#2563eb]" />, value: String(property.bedrooms), label: 'Dormitórios' })
  if ((property.suites ?? 0) > 0) keyFacts.push({ icon: <Bed className="w-5 h-5 text-[#2563eb]" />, value: String(property.suites), label: 'Suítes' })
  if ((property.bathrooms ?? 0) > 0) keyFacts.push({ icon: <Bath className="w-5 h-5 text-[#2563eb]" />, value: String(property.bathrooms), label: 'Banheiros' })
  keyFacts.push({ icon: <Car className="w-5 h-5 text-[#2563eb]" />, value: String(property.totalParkingSpots ?? 0), label: 'Vagas' })
  if ((property.environments ?? 0) > 0) keyFacts.push({ icon: <LayoutGrid className="w-5 h-5 text-[#2563eb]" />, value: String(property.environments), label: 'Ambientes' })
  if (property.floor) keyFacts.push({ icon: <Building2 className="w-5 h-5 text-[#2563eb]" />, value: property.floor, label: 'Andar' })
  // v1.4: condição (na planta, novo, usado, em construção) sempre visível no anúncio
  if (property.condition) keyFacts.push({ icon: <BadgeCheck className="w-5 h-5 text-[#2563eb]" />, value: property.condition, label: 'Condição' })

  const hasLocationBlock = !!(property.surroundingsInfo || (property.latitude && property.longitude))

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* v1.4: Ctrl+P nesta página sai em A4 (a ficha completa fica em /imprimir) */}
      <style dangerouslySetInnerHTML={{ __html: '@page { size: A4; margin: 12mm; }' }} />

      {/* Contador de views */}
      <ViewCounter propertyId={property.id} propertyRef={property.ref} title={property.title} price={price} city={property.city} />

      <div className="min-h-screen bg-[#F0F4F8] property-page">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-100 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-gray-400 flex-wrap">
              <Link href="/" className="hover:text-[#1e3a8a] transition-colors">Início</Link>
              {breadcrumb.map(crumb => (
                <span key={crumb.href} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />
                  <Link href={crumb.href} className="hover:text-[#1e3a8a] transition-colors">{crumb.label}</Link>
                </span>
              ))}
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {/* Galeria */}
          <div className="mb-4 md:mb-6">
            <PropertyGallery
              images={property.images.map(img => ({ url: img.url, thumbnailUrl: img.thumbnailUrl, alt: img.alt, caption: img.caption }))}
              videos={property.videos.filter(v => v.youtubeUrl).map(v => ({ url: v.youtubeUrl!, platform: v.platform }))}
              virtualTourUrl={property.virtualTourType !== 'NONE' ? property.virtualTourUrl : null}
              latitude={property.latitude ? Number(property.latitude) : null}
              longitude={property.longitude ? Number(property.longitude) : null}
              title={title}
              badge={property.marketStatus}
            />
          </div>

          {/* Barra de resumo (sticky no desktop; fixa embaixo no celular) */}
          <PropertySummaryBar
            propertyId={property.id}
            propertyRef={property.ref}
            url={pageUrl}
            title={title}
            price={price}
            hidePrice={property.hidePrice}
            transactionType={property.transactionType}
            bedrooms={property.bedrooms}
            parking={property.totalParkingSpots}
            area={usefulArea ?? totalArea}
            whatsapp={agentWhatsapp}
            imageUrl={hasCover ? `/api/og/imovel/${property.id}?modo=foto` : null}
            printUrl={`/imoveis/${property.slug}/imprimir`}
          />

          {/* Grid principal */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna esquerda */}
            <div className="lg:col-span-2 space-y-6 min-w-0">
              {/* Cabeçalho */}
              <header className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 mb-3 text-xs font-medium print:hidden">
                  {property.propertyType && (
                    <Link href={`/imoveis?tipo=${encodeURIComponent(property.propertyType)}`} className="px-2.5 py-1 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#1e3a8a]">{property.propertyType}</Link>
                  )}
                  <Link href={`/imoveis?transacao=${property.transactionType === 'RENT' ? 'alugar' : 'comprar'}`} className="px-2.5 py-1 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#1e3a8a]">{transactionLabel[property.transactionType]}</Link>
                  {property.condition && <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800" data-testid="condicao-imovel">{property.condition}</span>}
                  {property.neighborhood && <span className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600">{property.neighborhood}</span>}
                  {lastReduction && <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 inline-flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Preço reduzido</span>}
                </div>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-[#1e3a8a] mb-1 break-words">{headline}</h1>
                    {property.title && property.title !== headline && <p className="text-gray-700 font-medium break-words">{property.title}</p>}
                    {fullAddress && (
                      <p className="mt-2 flex items-start gap-1.5 text-gray-500 text-sm">
                        <MapPin className="w-4 h-4 mt-0.5 text-[#2563eb] flex-shrink-0" />{fullAddress}
                      </p>
                    )}
                  </div>
                  <div className="md:text-right flex-shrink-0">
                    {price && !property.hidePrice ? (
                      <p className="font-display text-3xl font-bold text-[#1e3a8a]">
                        {formatCurrency(price)}
                        {property.transactionType === 'RENT' && <span className="text-base font-normal text-gray-500">/mês</span>}
                      </p>
                    ) : (
                      <p className="font-display text-xl font-bold text-[#1e3a8a]">Consulte o valor</p>
                    )}
                    {sqm && !property.hidePrice && <p className="text-xs text-gray-500">{formatCurrency(Math.round(sqm.own))}/m²</p>}
                    <p className="text-xs text-gray-400 mt-1 inline-flex items-center gap-1"><Tag className="w-3 h-3" /> Código {property.ref}</p>
                  </div>
                </div>

                {/* Publicação e histórico */}
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 border-t border-gray-100 pt-3">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Publicado em {publishedAt.toLocaleDateString('pt-BR')}</span>
                  <span>{daysOnSite === 0 ? 'hoje no site' : `há ${daysOnSite} ${daysOnSite === 1 ? 'dia' : 'dias'} no site`}</span>
                  {lastReduction && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <TrendingDown className="w-3.5 h-3.5" /> Preço reduzido em {formatCurrency(Math.round(lastReduction.diff))} em {new Date(lastReduction.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  )}
                </div>

                {costRows.length > 0 && (
                  <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {costRows.map(row => (
                      <div key={row.label} className="flex items-baseline justify-between sm:block bg-[#F0F4F8] rounded-xl px-4 py-3">
                        <dt className="text-xs text-gray-400">{row.label}</dt>
                        <dd className="font-semibold text-[#1e3a8a] text-sm">{row.value}{row.suffix && <span className="font-normal text-gray-400"> {row.suffix}</span>}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </header>

              {/* Detalhes principais */}
              <section className="bg-white rounded-2xl p-6 shadow-sm" aria-labelledby="detalhes-title">
                <h2 id="detalhes-title" className="font-semibold text-[#1e3a8a] mb-4 flex items-center gap-2"><Layers className="w-4 h-4" /> Detalhes do imóvel</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {keyFacts.map(f => (
                    <div key={f.label} className="flex flex-col items-center p-3 bg-[#F0F4F8] rounded-xl text-center">
                      {f.icon}
                      <p className="font-semibold text-sm text-[#1e3a8a] mt-1">{f.value}</p>
                      <p className="text-xs text-gray-400">{f.label}</p>
                    </div>
                  ))}
                </div>
                {fichaRows.length > 0 && (
                  <details className="mt-4 group">
                    <summary className="cursor-pointer text-sm font-medium text-[#2563eb] hover:text-[#1e3a8a] list-none inline-flex items-center gap-1">
                      Ficha completa <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                    </summary>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 border-t border-gray-100 pt-3 mt-3">
                      {fichaRows.map(row => (
                        <div key={row.label} className="flex justify-between gap-4 py-2 border-b border-gray-50 text-sm">
                          <dt className="text-gray-500">{row.label}</dt>
                          <dd className="font-medium text-[#1e3a8a] text-right">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </section>

              {/* Preço por m² comparado (v1.4: abaixo da referência mostra os números; até a tolerância,
                  "no preço de mercado"; acima disso o bloco não aparece para o público) */}
              {sqm && !property.hidePrice && sqmView.headline !== 'hidden' && (
                <section className="bg-white rounded-2xl p-6 shadow-sm" aria-labelledby="sqm-title" data-testid="sqm-comparado">
                  <h2 id="sqm-title" className="font-semibold text-[#1e3a8a] mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Preço por m² comparado</h2>
                  {sqmView.headline === 'below' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {sqmView.items.filter(i => i.verdict === 'below').map(i => (
                        <div key={i.ref.kind + i.ref.label} className="rounded-xl bg-[#F0F4F8] p-4">
                          <p className="text-xs text-gray-500">
                            {i.ref.kind === 'manual' ? i.ref.label : `Média de ${i.ref.label}`}
                            {i.ref.count != null && ` (${i.ref.count} ${i.ref.kind === 'building' ? (i.ref.count === 1 ? 'unidade' : 'unidades') : (i.ref.count === 1 ? 'anúncio' : 'anúncios')})`}
                          </p>
                          <p className="font-semibold text-[#1e3a8a]">{formatCurrency(Math.round(i.ref.avg))}/m²</p>
                          <p className="text-sm font-semibold mt-1 text-emerald-700">Este imóvel está {i.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-[#F0F4F8] p-4 text-sm font-semibold text-[#1e3a8a]">Imóvel no preço de mercado</p>
                  )}
                  <p className="mt-3 text-xs text-gray-400">
                    Este imóvel: {formatCurrency(Math.round(sqm.own))}/m² (preço ÷ área {usefulArea ? 'útil' : 'total'}).{' '}
                    {sqmView.items.some(i => i.ref.kind === 'manual') ? 'Referência informada pelo corretor.' : 'Referência: média dos anúncios ativos deste site na mesma modalidade.'} Não substitui uma avaliação.
                  </p>
                </section>
              )}

              {/* Sobre este imóvel */}
              {property.description && property.description.trim() && (
                <section className="bg-white rounded-2xl p-6 shadow-sm" aria-labelledby="sobre-title">
                  <h2 id="sobre-title" className="font-display text-xl font-bold text-[#1e3a8a] mb-3">Sobre este imóvel</h2>
                  <DescriptionExpander text={property.description} />
                </section>
              )}

              {/* Características agrupadas */}
              <FeatureGroups groups={featureGroups} />

              {/* Quanto custa por mês */}
              {price && !property.hidePrice && (
                <div className="print:hidden">
                  <FinanceSimulator
                    price={price}
                    condominiumFee={condoFee}
                    condominiumFeePeriod={property.condominiumFeePeriod}
                    iptu={iptu}
                    iptuPeriod={property.iptuPeriod}
                    transactionType={property.transactionType}
                  />
                </div>
              )}

              {/* Histórico de preço */}
              {history.length > 1 && (
                <section className="bg-white rounded-2xl p-6 shadow-sm" aria-labelledby="historico-title">
                  <h2 id="historico-title" className="font-semibold text-[#1e3a8a] mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4" /> Histórico de preço</h2>
                  <ol className="divide-y divide-gray-100 text-sm">
                    {[...history].reverse().slice(0, 8).map((h, i, arr) => {
                      const prev = arr[i + 1]
                      const diff = prev ? h.price - prev.price : 0
                      return (
                        <li key={h.date + i} className="flex items-center justify-between gap-3 py-2">
                          <span className="text-gray-500">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                          <span className="font-medium text-[#1e3a8a]">{formatCurrency(h.price)}</span>
                          <span className={`text-xs font-semibold ${diff < 0 ? 'text-emerald-700' : diff > 0 ? 'text-orange-700' : 'text-gray-400'}`}>
                            {diff < 0 ? `▼ ${formatCurrency(Math.abs(diff))}` : diff > 0 ? `▲ ${formatCurrency(diff)}` : i === arr.length - 1 ? 'anúncio' : '—'}
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                </section>
              )}

              {/* Localização */}
              {hasLocationBlock && (
                <section className="bg-white rounded-2xl p-6 shadow-sm" aria-labelledby="localizacao-title">
                  <h2 id="localizacao-title" className="font-semibold text-[#1e3a8a] mb-3 flex items-center gap-2"><Globe className="w-4 h-4" /> Localização e arredores</h2>
                  {property.surroundingsInfo && <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line mb-4">{property.surroundingsInfo}</p>}
                  {property.latitude && property.longitude && (
                    <div className="print:hidden">
                      <MapEmbed latitude={Number(property.latitude)} longitude={Number(property.longitude)} title={title} />
                    </div>
                  )}
                </section>
              )}

              {/* v1.3 Viver aqui */}
              <AreaInsightBlock kind="property" id={property.id} />

              {/* v1.2: Conheça o prédio */}
              {property.empreendimento && property.empreendimento.status === 'PUBLISHED' && (
                <div className="rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] p-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#2563eb]">Conheça o prédio</p>
                    <p className="font-bold text-[#1e3a8a]">{property.empreendimento.name}</p>
                    <p className="text-sm text-gray-600">
                      {[property.unit?.block?.name, property.unit ? `apartamento ${property.unit.number}` : null, property.unit?.unitType?.name, property.empreendimento.builder ? `construtora ${property.empreendimento.builder}` : null, property.empreendimento.deliveryYear ? `entregue em ${property.empreendimento.deliveryYear}` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <Link href={`/empreendimentos/${property.empreendimento.slug}`} className="inline-flex items-center gap-1 rounded-full bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172554] print:hidden">
                    Ver o prédio e outras unidades
                  </Link>
                </div>
              )}

              {/* Documentos públicos */}
              {property.documents.length > 0 && (
                <section className="bg-white rounded-2xl p-6 shadow-sm print:hidden" aria-labelledby="docs-title">
                  <h2 id="docs-title" className="font-semibold text-[#1e3a8a] mb-4 flex items-center gap-2"><FileText className="w-4 h-4" /> Documentos</h2>
                  <div className="space-y-2">
                    {property.documents.map(doc => (
                      <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-[#F0F4F8] rounded-xl hover:bg-[#E2E8F0] transition-colors group" aria-label={`Baixar ${doc.name}`}>
                        <Download className="w-4 h-4 text-[#2563eb] flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-[#1e3a8a] flex-1 break-words">{doc.name}</span>
                        {doc.type && <span className="text-xs text-gray-400 uppercase">{doc.type}</span>}
                      </a>
                    ))}
                  </div>
                </section>
              )}

              <p className="text-xs text-gray-400 leading-relaxed">
                Todas as informações fornecidas pelo corretor são consideradas confiáveis, mas não são garantidas e devem ser verificadas de forma independente. Valores e disponibilidade sujeitos a alteração sem aviso.
              </p>

              {/* Links relacionados */}
              {relatedLinks.length > 0 && (
                <nav aria-labelledby="links-relacionados" className="bg-white rounded-2xl p-6 shadow-sm print:hidden">
                  <h2 id="links-relacionados" className="font-semibold text-[#1e3a8a] mb-3">Links relacionados</h2>
                  <ul className="space-y-1.5 text-sm">
                    {relatedLinks.map(l => (
                      <li key={l.href}><Link href={l.href} className="text-[#2563eb] hover:underline">{l.label}</Link></li>
                    ))}
                  </ul>
                </nav>
              )}
            </div>

            {/* Coluna direita — corretor, ações e formulário */}
            <aside className="lg:col-span-1 print:hidden">
              <div className="bg-white rounded-2xl p-6 shadow-sm lg:sticky lg:top-[184px] space-y-5">
                {/* v1.4: hub do corretor — foto inteira, nome, WhatsApp com ícone, CRECI e vínculo, sem cortes */}
                <div className="pb-5 border-b border-gray-100">
                  <AgentCard agent={agentCard} message={`Olá! Tenho interesse no imóvel ${property.ref} — ${title}. ${pageUrl}`} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <PriceDropAlert propertyId={property.id} propertyRef={property.ref} />
                  <a href={`/imoveis/${property.slug}/imprimir`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full bg-[#ea580c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c2410c]">
                    <Printer className="h-4 w-4" /> Imprimir ficha
                  </a>
                </div>

                <div>
                  <h2 className="font-display text-lg font-bold text-[#1e3a8a] mb-1">Envie sua mensagem!</h2>
                  <p className="text-sm text-gray-400 mb-4">Entre em contato sobre este imóvel.</p>
                  <ContactForm propertyId={property.id} propertyRef={property.ref} propertySlug={property.slug} whatsapp={agentWhatsapp} />
                </div>
              </div>
            </aside>
          </div>

          {/* Imóveis similares */}
          {similar.length > 0 && (
            <section className="mt-16 print:hidden" aria-labelledby="similares-title">
              <h2 id="similares-title" className="font-display text-2xl font-bold text-[#1e3a8a] mb-6">
                Anúncios similares para {transactionLabel[property.transactionType].toLowerCase()}
              </h2>
              <PropertyCarousel properties={similar} />
            </section>
          )}

          {/* Imóveis vendidos */}
          {soldSimilar.length > 0 && (
            <section className="mt-12 print:hidden" aria-labelledby="vendidos-title">
              <h2 id="vendidos-title" className="font-display text-2xl font-bold text-[#1e3a8a] mb-6">Imóveis vendidos nas proximidades</h2>
              <PropertyCarousel properties={soldSimilar} />
            </section>
          )}

          {/* v1.3: parceiros que ajudam a comprar */}
          <div className="mt-16 print:hidden">
            <PartnersStrip types={['BANCO', 'CARTORIO']} title="Parceiros que ajudam você a comprar" />
          </div>

          {/* Avaliações Google */}
          <div className="print:hidden">
            <GoogleReviews className="mt-16 pt-10 border-t border-gray-200" />
          </div>
        </div>
      </div>
    </>
  )
}
