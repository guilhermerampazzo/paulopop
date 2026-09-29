export const dynamic = 'force-dynamic'

/**
 * v1.3 — Página pública de um parceiro: cabeçalho com logo/capa, contato, benefício,
 * seções do editor, empreendimentos ligados e CTA "Quer uma indicação?".
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AtSign, BadgePercent, ChevronRight, Globe, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { absUrl } from '@/lib/site'
import { getSiteConfigCached } from '@/lib/cache'
import { parseSections, type SectionCta } from '@/lib/sections'
import { partnerTypeLabel } from '@/lib/partners'
import { fetchEmpreendimentosByIds } from '@/lib/section-data'
import { CtaBlock, EmpreendimentoCards, H2_CLS, LABEL_CLS, SectionIndex, SectionRenderer } from '@/components/public/SectionRenderer'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await prisma.partner.findUnique({ where: { slug: params.slug }, select: { name: true, type: true, status: true, seoTitle: true, seoDescription: true, tagline: true, summary: true, coverUrl: true, logoUrl: true, slug: true } })
  if (!p || p.status !== 'PUBLISHED') return { title: 'Parceiro não encontrado' }
  const title = p.seoTitle || `${p.name}: ${partnerTypeLabel(p.type).toLowerCase()} parceiro no DF`
  const description = p.seoDescription || p.tagline || p.summary?.slice(0, 160) || `${p.name}, parceiro indicado por Paulo Pop no Distrito Federal.`
  const og = absUrl(p.coverUrl || p.logoUrl)
  return {
    title, description,
    alternates: { canonical: absUrl(`/parceiros/${p.slug}`) },
    openGraph: { title: `${title} | Paulo Pop`, description, url: absUrl(`/parceiros/${p.slug}`), ...(og ? { images: [{ url: og }] } : {}) },
  }
}

export default async function ParceiroPage({ params }: Props) {
  const p = await prisma.partner.findUnique({ where: { slug: params.slug } })
  if (!p || p.status !== 'PUBLISHED') notFound()

  const [config, emps] = await Promise.all([getSiteConfigCached().catch(() => null), fetchEmpreendimentosByIds(p.empreendimentoIds)])
  const whatsapp = config?.ownerWhatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP ?? ''
  const sections = parseSections(p.sections)
  const hasCta = sections.some(s => s.type === 'cta' && s.visible !== false)
  const igUrl = p.instagram ? (/^https?:\/\//i.test(p.instagram) ? p.instagram : `https://instagram.com/${p.instagram.replace(/^@/, '')}`) : null
  const partnerWa = p.whatsapp?.replace(/\D/g, '')

  const contacts = [
    p.website && { icon: <Globe className="w-4 h-4" />, label: 'Site', value: p.website.replace(/^https?:\/\//, ''), href: p.website },
    p.phone && { icon: <Phone className="w-4 h-4" />, label: 'Telefone', value: p.phone, href: `tel:${p.phone.replace(/[^\d+]/g, '')}` },
    partnerWa && { icon: <MessageCircle className="w-4 h-4" />, label: 'WhatsApp', value: p.whatsapp, href: `https://wa.me/${partnerWa.length <= 11 ? '55' + partnerWa : partnerWa}` },
    p.email && { icon: <Mail className="w-4 h-4" />, label: 'E-mail', value: p.email, href: `mailto:${p.email}` },
    igUrl && { icon: <AtSign className="w-4 h-4" />, label: 'Instagram', value: p.instagram, href: igUrl },
    p.address && { icon: <MapPin className="w-4 h-4" />, label: 'Endereço', value: p.address, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}` },
  ].filter((c): c is { icon: JSX.Element; label: string; value: string; href: string } => !!c)

  const cta: SectionCta = {
    id: 'cta-indicacao', type: 'cta', title: 'Quer uma indicação?', text: `Fale com o Paulo e receba o contato direto de ${p.name}, com as condições combinadas para clientes.`,
    buttonLabel: 'Pedir indicação no WhatsApp', whatsappMessage: `Olá! Quero uma indicação para ${p.name}.`, showForm: false, style: 'blue',
  }
  const ctx = { whatsapp, pageName: p.name }
  const mapOk = p.mapEmbedUrl && /^https:\/\/(www\.)?google\.[a-z.]+\/maps/i.test(p.mapEmbedUrl)

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Organization', name: p.name, url: absUrl(`/parceiros/${p.slug}`),
    ...(p.logoUrl ? { logo: absUrl(p.logoUrl) } : {}), ...(p.website ? { sameAs: [p.website, igUrl].filter(Boolean) } : {}),
    ...(p.phone ? { telephone: p.phone } : {}), ...(p.address ? { address: { '@type': 'PostalAddress', streetAddress: p.address, addressRegion: 'DF', addressCountry: 'BR' } } : {}),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="relative bg-[#1e3a8a] text-white overflow-hidden">
        {p.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#172554] via-[#1e3a8a]/70 to-transparent" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-300 flex items-center gap-1 flex-wrap">
            <Link href="/" className="hover:text-white">Início</Link><ChevronRight className="w-3 h-3" />
            <Link href="/parceiros" className="hover:text-white">Parceiros</Link><ChevronRight className="w-3 h-3" />
            <span className="text-white">{p.name}</span>
          </nav>
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-6">
            {p.logoUrl && (
              <div className="w-28 h-28 rounded-2xl bg-white p-3 flex items-center justify-center flex-shrink-0 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.logoUrl} alt={p.name} className="max-h-full max-w-full object-contain" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#93c5fd]">{partnerTypeLabel(p.type)}</p>
              <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl break-words">{p.name}</h1>
              {p.tagline && <p className="mt-3 text-xl text-[#fdba74] font-medium">{p.tagline}</p>}
            </div>
          </div>
        </div>
      </section>

      <div className="bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_320px] min-w-0">
            <div className="min-w-0 space-y-14">
              {p.benefit && (
                <section className="rounded-3xl border border-[#fed7aa] bg-[#fff7ed] p-6">
                  <p className={LABEL_CLS}>Benefício para clientes do Paulo Pop</p>
                  <p className="mt-2 flex items-start gap-3 text-lg font-medium text-[#9a3412]"><BadgePercent className="w-6 h-6 flex-shrink-0" /> {p.benefit}</p>
                </section>
              )}
              {p.summary && <p className="text-lg leading-8 text-gray-700 break-words">{p.summary}</p>}

              <SectionRenderer sections={sections} context={ctx} />

              {emps.length > 0 && (
                <section id="empreendimentos" className="scroll-mt-32">
                  <p className={LABEL_CLS}>Empreendimentos</p>
                  <h2 className={`${H2_CLS} mt-1 mb-6`}>Empreendimentos de {p.name}</h2>
                  <EmpreendimentoCards items={emps} />
                </section>
              )}

              {!hasCta && <section id="indicacao" className="scroll-mt-32"><CtaBlock s={cta} ctx={ctx} /></section>}
            </div>

            <aside className="space-y-6 min-w-0">
              {contacts.length > 0 && (
                <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm">
                  <h2 className="font-display text-lg font-bold text-[#1e3a8a] mb-4">Contato</h2>
                  <ul className="space-y-3">
                    {contacts.map(c => (
                      <li key={c.label} className="min-w-0">
                        <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="flex items-start gap-3 text-sm text-gray-700 hover:text-[#1e3a8a]">
                          <span className="mt-0.5 text-[#2563eb]">{c.icon}</span>
                          <span className="min-w-0"><span className="block text-[11px] uppercase tracking-wide text-gray-400">{c.label}</span><span className="break-words">{c.value}</span></span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {mapOk && (
                <div className="overflow-hidden rounded-3xl border border-gray-100 shadow-sm">
                  <iframe src={p.mapEmbedUrl!} title={`Mapa: ${p.name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-64 w-full border-0" />
                </div>
              )}
              <SectionIndex sections={sections} />
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}
