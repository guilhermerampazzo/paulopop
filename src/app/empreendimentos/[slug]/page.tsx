export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { ContactForm } from '@/components/public/ContactForm'
import { GoogleReviews } from '@/components/public/GoogleReviews'
import { formatCurrency } from '@/lib/formatters'
import type { Metadata } from 'next'
import { PropertyGallery } from '@/components/public/PropertyGallery'
import { EmpreendimentoHub } from '@/components/public/EmpreendimentoHub'
import { TipologiasTable } from '@/components/public/TipologiasTable'
import { AreaInsightBlock } from '@/components/public/AreaInsightBlock'
import { PartnersStrip } from '@/components/public/PartnersStrip'
import { STAGE_LABEL } from '@/lib/empreendimento-units'
import {
  MapPin, ChevronRight, MessageCircle, Phone,
  Building2, Bed, Bath, Car, Maximize2, Calendar,
  Layers, DollarSign, TreePine, Navigation, CheckCircle, PlayCircle
} from 'lucide-react'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const emp = await prisma.empreendimento.findUnique({
    where: { slug: params.slug, status: 'PUBLISHED' },
    select: { name: true, tagline: true, description: true, city: true, state: true, coverUrl: true },
  })
  if (!emp) return { title: 'Empreendimento não encontrado' }
  return {
    title: emp.name,
    description: emp.tagline ?? emp.description?.substring(0, 160) ?? emp.name,
    alternates: { canonical: `/empreendimentos/${params.slug}` },
    openGraph: {
      title: `${emp.name} | Paulo Pop`,
      description: emp.tagline ?? emp.description?.substring(0, 160) ?? '',
      images: emp.coverUrl ? [{ url: emp.coverUrl }] : [],
      type: 'website',
      locale: 'pt_BR',
    },
  }
}

export default async function EmpreendimentoPage({ params }: Props) {
  const [emp, config] = await Promise.all([
    prisma.empreendimento.findUnique({
      where: { slug: params.slug, status: 'PUBLISHED' },
      include: {
        images: { orderBy: [{ category: 'asc' }, { order: 'asc' }] },
        floorPlanImages: { orderBy: { order: 'asc' } },
        _count: { select: { unitTypes: true } },
      },
    }),
    prisma.siteConfig.findFirst(),
  ])

  if (!emp) notFound()
  const unitTypeCount = emp._count.unitTypes

  const imagesOf = (cat: string) => emp.images.filter(i => i.category === cat)
  const heroImages = [...imagesOf('FACHADA'), ...imagesOf('AREAS_COMUNS')]
  const coverImage = emp.coverUrl ?? heroImages[0]?.url

  const ownerName = config?.ownerName ?? 'Paulo Pop'
  const ownerPhoto = config?.ownerPhotoUrl ?? null
  const ownerWhatsapp = (emp.ctaWhatsapp ?? config?.ownerWhatsapp ?? '').replace(/\D/g, '')
  const ownerPhone = config?.ownerPhone ?? null
  const ownerCreci = config?.ownerCreci ?? null
  const ownerCompany = config?.ownerCompany ?? null

  const waText = encodeURIComponent(`Olá! Tenho interesse no empreendimento ${emp.name}.`)
  const waHref = ownerWhatsapp ? `https://wa.me/${ownerWhatsapp}?text=${waText}` : '#'

  const highlights = emp.highlights ? emp.highlights.split('\n').map(l => l.trim()).filter(Boolean) : []
  const amenities = emp.amenities ? emp.amenities.split('\n').map(l => l.trim()).filter(Boolean) : []

  return (
    <>
      <div className="min-h-screen bg-[#F0F4F8] pb-24">

        {/* ── Hero ── */}
        <div className="relative h-[65vh] min-h-[440px] overflow-hidden bg-[#1e3a8a]">
          {coverImage && (
            <Image src={coverImage} alt={emp.name} fill priority sizes="100vw" className="object-cover opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a8a]/90 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-12 max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${emp.stage === 'LANCAMENTO' ? 'bg-[#ea580c] text-white' : emp.stage === 'EM_OBRAS' ? 'bg-amber-400 text-amber-950' : 'bg-white/90 text-[#1e3a8a]'}`}>
                {STAGE_LABEL[emp.stage] ?? emp.stage}{emp.deliveryYear ? ` · ${emp.stage === 'ENTREGUE' ? 'entregue em' : 'entrega em'} ${emp.deliveryYear}` : ''}
              </span>
              {emp.neighborhood && (
                <p className="text-[#93c5fd] text-xs font-semibold uppercase tracking-widest">{emp.neighborhood}</p>
              )}
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-white mb-3 leading-tight">{emp.name}</h1>
            {emp.tagline && <p className="text-blue-100 text-xl md:text-2xl mb-6">{emp.tagline}</p>}
            <div className="flex flex-wrap gap-4">
              {ownerWhatsapp && (
                <a href={waHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white rounded-full font-semibold text-sm shadow-lg hover:bg-[#1ebe5d] transition-colors">
                  <MessageCircle className="w-5 h-5" />{emp.ctaLabel ?? 'Falar com corretor'}
                </a>
              )}
              <a href="#sobre"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white/40 text-white rounded-full font-semibold text-sm hover:border-white transition-colors">
                Conhecer o projeto <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* ── Ficha rápida ── */}
        <div className="bg-[#1e3a8a] py-5 border-t border-[#1e40af]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-6 justify-center">
            {emp.totalUnits && (
              <div className="flex items-center gap-2 text-white">
                <Layers className="w-4 h-4 text-[#2563eb]" />
                <span className="text-sm"><strong>{emp.totalUnits}</strong> unidades</span>
              </div>
            )}
            {emp.builder && (
              <div className="flex items-center gap-2 text-white">
                <Building2 className="w-4 h-4 text-[#2563eb]" />
                <span className="text-sm">Construtora <strong>{emp.builder}</strong></span>
              </div>
            )}
            {emp.elevators != null && (
              <div className="flex items-center gap-2 text-white">
                <Layers className="w-4 h-4 text-[#2563eb]" />
                <span className="text-sm">{emp.elevators > 0 ? <><strong>{emp.elevators}</strong> {emp.elevators === 1 ? 'elevador' : 'elevadores'}</> : 'Sem elevador'}</span>
              </div>
            )}
            {emp.condoFeeAvg && (
              <div className="flex items-center gap-2 text-white">
                <DollarSign className="w-4 h-4 text-[#2563eb]" />
                <span className="text-sm">Condomínio médio <strong>{formatCurrency(Number(emp.condoFeeAvg))}</strong></span>
              </div>
            )}
            {(emp.bedroomsMin || emp.bedroomsMax) && (
              <div className="flex items-center gap-2 text-white">
                <Bed className="w-4 h-4 text-[#2563eb]" />
                <span className="text-sm">
                  <strong>{emp.bedroomsMin === emp.bedroomsMax ? emp.bedroomsMin : `${emp.bedroomsMin ?? '?'} a ${emp.bedroomsMax ?? '?'}`}</strong> quartos
                </span>
              </div>
            )}
            {(emp.suitesMin || emp.suitesMax) && (
              <div className="flex items-center gap-2 text-white">
                <Bed className="w-4 h-4 text-[#2563eb]" />
                <span className="text-sm">
                  <strong>{emp.suitesMin === emp.suitesMax ? emp.suitesMin : `${emp.suitesMin ?? '?'} a ${emp.suitesMax ?? '?'}`}</strong> suítes
                </span>
              </div>
            )}
            {(emp.areaMin || emp.areaMax) && (
              <div className="flex items-center gap-2 text-white">
                <Maximize2 className="w-4 h-4 text-[#2563eb]" />
                <span className="text-sm">
                  <strong>{emp.areaMin === emp.areaMax ? `${emp.areaMin}m²` : `${emp.areaMin ?? '?'} – ${emp.areaMax ?? '?'}m²`}</strong> área privativa
                </span>
              </div>
            )}
            {emp.deliveryDate && (
              <div className="flex items-center gap-2 text-white">
                <Calendar className="w-4 h-4 text-[#2563eb]" />
                <span className="text-sm">Entrega: <strong>{emp.deliveryDate}</strong></span>
              </div>
            )}
            {emp.priceMin && (
              <div className="flex items-center gap-2 text-white">
                <DollarSign className="w-4 h-4 text-[#2563eb]" />
                <span className="text-sm">
                  A partir de <strong>{formatCurrency(Number(emp.priceMin))}</strong>
                  {emp.priceMax ? ` até ${formatCurrency(Number(emp.priceMax))}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Breadcrumb ── */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav className="flex items-center gap-1 text-sm text-gray-400 flex-wrap">
              <Link href="/" className="hover:text-[#1e3a8a] transition-colors">Início</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href="/empreendimentos" className="hover:text-[#1e3a8a] transition-colors">Empreendimentos</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-600">{emp.name}</span>
            </nav>
          </div>
        </div>

        {/* ── Conteúdo principal ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10" id="sobre">

          <div className="lg:col-span-2 space-y-10">

            {/* Sobre */}
            {emp.description && (
              <section>
                <SectionTitle>Sobre o Empreendimento</SectionTitle>
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{emp.description}</p>
                  {highlights.length > 0 && (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                      {highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-[#2563eb] mt-0.5 flex-shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}

            {/* v1.2: hub do prédio — unidades disponíveis, negociados, números e mapa */}
            <EmpreendimentoHub empreendimentoId={emp.id} empName={emp.name} stage={emp.stage} whatsapp={ownerWhatsapp} />
            <AreaInsightBlock kind="empreendimento" id={emp.id} />
            <PartnersStrip types={['CONSTRUTORA', 'BANCO']} title="Parceiros deste empreendimento" limit={6} />

            {/* Galeria fachada */}
            {heroImages.length > 0 && (
              <section>
                <SectionTitle>Fachada e Áreas Comuns</SectionTitle>
                <PropertyGallery images={heroImages.map(i => ({ url: i.url, alt: i.caption ?? undefined }))} title={emp.name} />
              </section>
            )}

            {/* Vídeo */}
            {emp.youtubeUrl && (() => {
              const match = emp.youtubeUrl.match(/(?:shorts\/|v=|youtu\.be\/)([^&?/\s]+)/)
              if (!match) return null
              return (
                <section>
                  <SectionTitle icon={<PlayCircle className="w-5 h-5" />}>Vídeo do Empreendimento</SectionTitle>
                  <div className="aspect-video rounded-2xl overflow-hidden shadow-sm">
                    <iframe
                      src={`https://www.youtube.com/embed/${match[1]}`}
                      title={`Vídeo de ${emp.name}`}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </section>
              )
            })()}

            {/* Tour Virtual */}
            {emp.virtualTourType !== 'NONE' && emp.virtualTourUrl && (
              <section>
                <SectionTitle>Tour Virtual</SectionTitle>
                <div className="aspect-video rounded-2xl overflow-hidden shadow-sm">
                  <iframe
                    src={emp.virtualTourUrl}
                    title={`Tour virtual de ${emp.name}`}
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              </section>
            )}

            {/* Tipologias */}
            {(emp.tipologiasDescription || emp.floorPlanImages.length > 0 || unitTypeCount > 0) && (
              <section>
                <SectionTitle>Apartamentos e Tipologias</SectionTitle>
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                  {/* v1.4: tipologias cadastradas no painel (nome, andares, quartos, áreas, vagas, planta) */}
                  {unitTypeCount > 0 && <TipologiasTable empreendimentoId={emp.id} />}
                  {(emp.bedroomsMin || emp.bedroomsMax || emp.areaMin || emp.areaMax) && (
                    <div className="flex flex-wrap gap-4">
                      {(emp.bedroomsMin || emp.bedroomsMax) && (
                        <div className="flex items-center gap-2 p-3 bg-[#F0F4F8] rounded-xl">
                          <Bed className="w-4 h-4 text-[#2563eb]" />
                          <div>
                            <p className="text-xs text-gray-400">Dormitórios</p>
                            <p className="font-semibold text-sm text-[#1e3a8a]">
                              {emp.bedroomsMin === emp.bedroomsMax ? emp.bedroomsMin : `${emp.bedroomsMin ?? '?'} a ${emp.bedroomsMax ?? '?'}`}
                            </p>
                          </div>
                        </div>
                      )}
                      {(emp.areaMin || emp.areaMax) && (
                        <div className="flex items-center gap-2 p-3 bg-[#F0F4F8] rounded-xl">
                          <Maximize2 className="w-4 h-4 text-[#2563eb]" />
                          <div>
                            <p className="text-xs text-gray-400">Área Privativa</p>
                            <p className="font-semibold text-sm text-[#1e3a8a]">
                              {emp.areaMin === emp.areaMax ? `${emp.areaMin}m²` : `${emp.areaMin ?? '?'} – ${emp.areaMax ?? '?'}m²`}
                            </p>
                          </div>
                        </div>
                      )}
                      {(emp.suitesMin || emp.suitesMax) && (
                        <div className="flex items-center gap-2 p-3 bg-[#F0F4F8] rounded-xl">
                          <Bed className="w-4 h-4 text-[#2563eb]" />
                          <div>
                            <p className="text-xs text-gray-400">Suítes</p>
                            <p className="font-semibold text-sm text-[#1e3a8a]">
                              {emp.suitesMin === emp.suitesMax ? emp.suitesMin : `${emp.suitesMin ?? '?'} a ${emp.suitesMax ?? '?'}`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {emp.tipologiasDescription && (
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm">{emp.tipologiasDescription}</p>
                  )}
                  {emp.floorPlanImages.length > 0 && (
                    <div>
                      <p className="font-semibold text-[#1e3a8a] mb-3 text-sm">Plantas</p>
                      <PropertyGallery images={emp.floorPlanImages.map(i => ({ url: i.url, alt: i.caption ?? undefined }))} title={emp.name} />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Lazer */}
            {(emp.lazerDescription || imagesOf('LAZER').length > 0 || amenities.length > 0) && (
              <section>
                <SectionTitle icon={<TreePine className="w-5 h-5" />}>Área de Lazer</SectionTitle>
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                  {emp.lazerDescription && (
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm">{emp.lazerDescription}</p>
                  )}
                  {amenities.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {amenities.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="w-2 h-2 rounded-full bg-[#2563eb] flex-shrink-0" />{a}
                        </div>
                      ))}
                    </div>
                  )}
                  {imagesOf('LAZER').length > 0 && (
                    <PropertyGallery images={imagesOf('LAZER').map(i => ({ url: i.url, alt: i.caption ?? undefined }))} title={emp.name} />
                  )}
                </div>
              </section>
            )}

            {/* Financeiro */}
            {(emp.priceMin || emp.priceMax || emp.paymentInfo || emp.banks || emp.financing) && (
              <section>
                <SectionTitle icon={<DollarSign className="w-5 h-5" />}>Preço e Formas de Pagamento</SectionTitle>
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                  {(emp.priceMin || emp.priceMax) && (
                    <div className="p-4 bg-[#F0F4F8] rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">Valores</p>
                      <p className="text-2xl font-bold text-[#1e3a8a]">
                        {emp.priceMin && emp.priceMax
                          ? `${formatCurrency(Number(emp.priceMin))} a ${formatCurrency(Number(emp.priceMax))}`
                          : emp.priceMin
                            ? `A partir de ${formatCurrency(Number(emp.priceMin))}`
                            : `Até ${formatCurrency(Number(emp.priceMax))}`}
                      </p>
                    </div>
                  )}
                  {emp.financing && (
                    <p className="text-sm text-gray-600"><strong>Financiamento:</strong> {emp.financing}</p>
                  )}
                  {emp.paymentInfo && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Condições de Pagamento</p>
                      <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm">{emp.paymentInfo}</p>
                    </div>
                  )}
                  {emp.banks && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Bancos Financiadores</p>
                      <p className="text-gray-600 text-sm">{emp.banks}</p>
                    </div>
                  )}
                  {ownerWhatsapp && (
                    <a href={waHref} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-medium hover:bg-[#1ebe5d] transition-colors">
                      <MessageCircle className="w-4 h-4" />Consultar condições
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* Localização */}
            {(emp.locationDescription || emp.address || imagesOf('LOCALIZACAO').length > 0) && (
              <section>
                <SectionTitle icon={<Navigation className="w-5 h-5" />}>Localização</SectionTitle>
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                  {emp.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-[#2563eb] mt-0.5 flex-shrink-0" />
                      <span>{[emp.address, emp.neighborhood, emp.city, emp.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {emp.locationDescription && (
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm">{emp.locationDescription}</p>
                  )}
                  {emp.latitude && emp.longitude && (
                    <div className="rounded-xl overflow-hidden h-64 bg-gray-100">
                      <iframe
                        title="Mapa do empreendimento"
                        src={`https://maps.google.com/maps?q=${emp.latitude},${emp.longitude}&z=15&output=embed`}
                        className="w-full h-full border-0"
                        loading="lazy"
                        allowFullScreen
                      />
                    </div>
                  )}
                  {imagesOf('LOCALIZACAO').length > 0 && (
                    <PropertyGallery images={imagesOf('LOCALIZACAO').map(i => ({ url: i.url, alt: i.caption ?? undefined }))} title={emp.name} />
                  )}
                </div>
              </section>
            )}

            {/* Avaliações Google */}
            <GoogleReviews />

            {/* Corretor */}
            <section>
              <SectionTitle>Seu Corretor</SectionTitle>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-[#F0F4F8] flex-shrink-0 relative">
                    {ownerPhoto ? (
                      <Image src={ownerPhoto} alt={ownerName} fill sizes="64px" className="object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8 m-4 text-gray-300" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-[#1e3a8a] text-lg">{ownerName}</p>
                    {ownerCompany && <p className="text-sm text-gray-500">{ownerCompany}</p>}
                    {ownerCreci && <p className="text-xs text-gray-400">CRECI: {ownerCreci}</p>}
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {ownerPhone && (
                    <a href={`tel:${ownerPhone}`}
                      className="flex items-center gap-2 px-4 py-2 border border-[#1e3a8a] text-[#1e3a8a] rounded-xl text-sm font-medium hover:bg-[#1e3a8a] hover:text-white transition-colors">
                      <Phone className="w-4 h-4" />Ligar
                    </a>
                  )}
                  {ownerWhatsapp && (
                    <a href={waHref} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl text-sm font-medium hover:bg-[#1ebe57] transition-colors">
                      <MessageCircle className="w-4 h-4" fill="white" strokeWidth={0} />WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </section>

          </div>

          {/* Formulário lateral */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
              {/* Foto e dados do corretor */}
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-[#F0F4F8] flex-shrink-0 relative">
                  {ownerPhoto ? (
                    <Image src={ownerPhoto} alt={ownerName} fill sizes="56px" className="object-cover" />
                  ) : (
                    <Building2 className="w-7 h-7 m-3.5 text-gray-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[#1e3a8a] text-sm truncate">{ownerName}</p>
                  {ownerCompany && <p className="text-xs text-gray-400 truncate">{ownerCompany}</p>}
                  {ownerCreci && <p className="text-xs text-gray-400">CRECI: {ownerCreci}</p>}
                  {ownerPhone && (
                    <a href={`tel:${ownerPhone}`} className="text-xs text-[#2563eb] hover:underline">{ownerPhone}</a>
                  )}
                </div>
              </div>
              <h2 className="font-display text-lg font-bold text-[#1e3a8a] mb-1">Tenho interesse!</h2>
              <p className="text-sm text-gray-400 mb-5">Deixe seu contato e entraremos em breve.</p>
              <ContactForm whatsapp={ownerWhatsapp} />
            </div>
          </div>

        </div>
      </div>

      {/* Barra inferior */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-2xl py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#F0F4F8] flex-shrink-0 relative">
              {ownerPhoto ? (
                <Image src={ownerPhoto} alt={ownerName} fill sizes="40px" className="object-cover" />
              ) : (
                <Building2 className="w-5 h-5 m-2.5 text-gray-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[#1e3a8a] text-sm truncate">{ownerName}</p>
              {ownerCompany && <p className="text-xs text-gray-400 truncate">{ownerCompany}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {ownerPhone && (
              <a href={`tel:${ownerPhone}`}
                className="flex items-center gap-1.5 px-3 py-2 border border-[#1e3a8a] text-[#1e3a8a] rounded-xl text-sm font-medium hover:bg-[#1e3a8a] hover:text-white transition-colors">
                <Phone className="w-4 h-4" /><span className="hidden sm:inline">Ligar</span>
              </a>
            )}
            {ownerWhatsapp && (
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366] text-white rounded-xl text-sm font-medium hover:bg-[#1ebe57] transition-colors">
                <MessageCircle className="w-4 h-4" fill="white" strokeWidth={0} />WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h2 className="font-display text-xl font-bold text-[#1e3a8a] mb-4 flex items-center gap-2">
      {icon && <span className="text-[#2563eb]">{icon}</span>}
      {children}
    </h2>
  )
}

void [Bath, Car]
