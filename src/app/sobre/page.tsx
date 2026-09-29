export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Testimonials } from '@/components/public/Testimonials'
import { ContactForm } from '@/components/public/ContactForm'
import { PropertyCard } from '@/components/public/PropertyCard'
import { Phone, Mail, MapPin, Building2, MessageCircle } from 'lucide-react'
import {
  YoutubeIcon, FacebookIcon, LinkedinIcon, TwitterXIcon, InstagramIcon
} from '@/components/ui/SocialIcons'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const config = await prisma.siteConfig.findFirst()
  const name = config?.ownerName ?? 'Paulo Pop'
  return {
    title: `Sobre ${name} | Corretor de Imóveis`,
    description: config?.ownerBio?.substring(0, 160)
      ?? `Conheça ${name}, corretor de imóveis especializado em compra, venda e aluguel.`,
  }
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.013 9.488c-.145.658-.537.818-1.084.508l-3-2.21-1.448 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.28 14.49l-2.95-.924c-.642-.2-.654-.642.135-.953l11.522-4.443c.535-.194 1.003.13.575.078z" />
    </svg>
  )
}

export default async function SobrePage() {
  const [config, properties] = await Promise.all([
    prisma.siteConfig.findFirst(),
    prisma.property.findMany({
      where: { status: 'ACTIVE', hideOnSite: false },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true, slug: true, title: true, propertyType: true, transactionType: true, status: true,
        price: true, totalArea: true, usefulArea: true, suites: true, balconies: true, bedrooms: true, bathrooms: true, environments: true,
        totalParkingSpots: true, neighborhood: true, city: true, state: true, zipCode: true, createdAt: true,
        images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 1, select: { url: true, thumbnailUrl: true } },
      },
    }),
  ])

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const ownerName = config?.ownerName ?? 'Paulo Pop'
  const whatsapp = config?.ownerWhatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP ?? ''

  const socialLinks = [
    { href: whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : null, icon: <MessageCircle className="w-5 h-5" fill="white" strokeWidth={0} />, label: 'WhatsApp', color: 'bg-[#25D366]' },
    { href: config?.ownerTelegram, icon: <TelegramIcon className="w-5 h-5" />, label: 'Telegram', color: 'bg-[#0088cc]' },
    { href: config?.ownerYoutube, icon: <YoutubeIcon className="w-5 h-5" />, label: 'YouTube', color: 'bg-red-600' },
    { href: config?.ownerFacebook, icon: <FacebookIcon className="w-5 h-5" />, label: 'Facebook', color: 'bg-[#1877F2]' },
    { href: config?.ownerLinkedin, icon: <LinkedinIcon className="w-5 h-5" />, label: 'LinkedIn', color: 'bg-[#0A66C2]' },
    { href: (config as Record<string, unknown> | null)?.ownerTwitter as string | undefined, icon: <TwitterXIcon className="w-5 h-5" />, label: 'Twitter/X', color: 'bg-black' },
    { href: config?.ownerInstagram, icon: <InstagramIcon className="w-5 h-5" />, label: 'Instagram', color: 'bg-gradient-to-br from-purple-600 to-pink-500' },
  ].filter(s => !!s.href)

  const contactItems = [
    config?.ownerPhone && { icon: <Phone className="w-4 h-4 text-[#2563eb]" />, label: 'Telefone', value: config.ownerPhone, href: `tel:${config.ownerPhone}` },
    whatsapp && { icon: <MessageCircle className="w-4 h-4 text-[#25D366]" />, label: 'WhatsApp', value: whatsapp, href: `https://wa.me/${whatsapp.replace(/\D/g, '')}` },
    config?.ownerEmail && { icon: <Mail className="w-4 h-4 text-[#2563eb]" />, label: 'E-mail', value: config.ownerEmail, href: `mailto:${config.ownerEmail}` },
    config?.ownerAddress && { icon: <MapPin className="w-4 h-4 text-[#2563eb]" />, label: 'Endereço', value: config.ownerAddress, href: null },
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* Hero banner */}
      <div
        className="bg-[#1e3a8a] py-16 px-4"
        aria-labelledby="sobre-title"
      >
        <div className="max-w-7xl mx-auto">
          <p className="text-[#2563eb] text-xs font-semibold uppercase tracking-widest mb-2">Corretor de Imóveis</p>
          <h1 id="sobre-title" className="font-display text-4xl md:text-5xl font-bold text-white">
            {ownerName}
          </h1>
          {config?.ownerCreci && (
            <p className="text-blue-200 mt-1">CRECI {config.ownerCreci}</p>
          )}
          {config?.ownerCompany && (
            <p className="text-blue-300 text-sm">{config.ownerCompany}</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Coluna esquerda */}
          <div className="lg:col-span-1 space-y-6">
            {/* Foto */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="aspect-[3/4] bg-[#F0F4F8]">
                {config?.ownerPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.ownerPhotoUrl}
                    alt={ownerName}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-24 h-24 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Redes sociais */}
              {socialLinks.length > 0 && (
                <div className="p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Redes Sociais
                  </p>
                  <div className="flex flex-wrap gap-2" aria-label="Redes sociais">
                    {socialLinks.map(s => (
                      <a
                        key={s.label}
                        href={s.href!}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.label}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110 ${s.color}`}
                      >
                        {s.icon}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contatos */}
            {contactItems.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h2 className="font-semibold text-[#1e3a8a] mb-4">Contato</h2>
                <div className="space-y-3">
                  {contactItems.map((item) => item && (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#F0F4F8] rounded-full flex items-center justify-center flex-shrink-0">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">{item.label}</p>
                        {item.href ? (
                          <a
                            href={item.href}
                            target={item.href.startsWith('http') ? '_blank' : undefined}
                            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            className="text-sm font-medium text-[#1e3a8a] hover:text-[#2563eb] transition-colors truncate block"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-gray-700 truncate">{item.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Coluna direita */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio */}
            {config?.ownerBio && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-display text-xl font-bold text-[#1e3a8a] mb-4">Sobre Mim</h2>
                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                  {config.ownerBio.split('\n').map((paragraph, i) => (
                    paragraph.trim() && <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Imóveis ativos */}
            {properties.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-bold text-[#1e3a8a] mb-4">
                  Meus Imóveis Disponíveis
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {properties.map(p => (
                    <PropertyCard
                      key={p.id}
                      {...p}
                      price={p.price ? Number(p.price) : null}
                      totalArea={p.totalArea ? Number(p.totalArea) : null}
                      usefulArea={p.usefulArea ? Number(p.usefulArea) : null}
                      suites={p.suites}
                      balconies={p.balconies}
                      coverImage={p.images[0]?.thumbnailUrl ?? p.images[0]?.url ?? null}
                      isNew={p.createdAt > thirtyDaysAgo}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Formulário de contato */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-display text-xl font-bold text-[#1e3a8a] mb-2">Entre em Contato</h2>
              <p className="text-sm text-gray-400 mb-5">
                Preencha o formulário e responderei em breve.
              </p>
              <ContactForm
                whatsapp={whatsapp}
                whatsappMessage={config?.whatsappMessage ?? undefined}
              />
            </div>
          </div>
        </div>
        {/* v1.1: depoimentos aprovados no painel */}
        <Testimonials className="py-12" title="O que dizem os clientes" />
      </div>
    </div>
  )
}
