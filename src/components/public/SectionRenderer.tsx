/**
 * v1.3 — Renderizador público das seções do editor (`src/lib/sections.ts`).
 * Server component assíncrono: os tipos `properties`, `empreendimentos` e `blog` consultam o banco.
 * Também exporta `SectionIndex` (índice lateral com as âncoras das seções com título).
 */
import Link from 'next/link'
import { Building2, ExternalLink, MapPin, MessageCircle, Phone, PlayCircle } from 'lucide-react'
import type { Section, SectionText, SectionGallery, SectionVideo, SectionItems, SectionTimeline, SectionPeople, SectionStats, SectionMap, SectionProperties, SectionEmpreendimentos, SectionCta, SectionFaq, SectionBlog } from '@/lib/sections'
import { sanitizeHtml } from '@/lib/sanitize'
import { STAGE_LABEL } from '@/lib/empreendimento-units'
import { fetchBlogForSection, fetchEmpreendimentosForSection, fetchPropertiesForSection, mapsSearchUrl, youtubeEmbedUrl, type EmpCard } from '@/lib/section-data'
import { PropertyCarousel } from './PropertyCarousel'
import { ContactForm } from './ContactForm'
import { GalleryLightbox } from './GalleryLightbox'

export interface SectionRenderContext {
  cityNames?: string[]
  whatsapp?: string
  pageName?: string
}

export const H2_CLS = 'font-display text-2xl md:text-3xl font-bold text-[#1e3a8a]'
export const LABEL_CLS = 'text-[#ea580c] uppercase tracking-wide text-xs font-semibold'

export function sectionAnchor(s: Section): string {
  return s.anchor || `secao-${s.id}`
}

function Heading({ s, label }: { s: Section; label?: string }) {
  if (!s.title && !s.subtitle) return null
  return (
    <header className="mb-6">
      {label && <p className={LABEL_CLS}>{label}</p>}
      {s.title && <h2 className={`${H2_CLS} mt-1`}>{s.title}</h2>}
      {s.subtitle && <p className="mt-2 text-gray-600 max-w-3xl">{s.subtitle}</p>}
    </header>
  )
}

const waLink = (whatsapp: string | undefined, text: string) => {
  const digits = (whatsapp ?? '').replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : '/contato'
}

// ─── Tipos simples ────────────────────────────────────────────────────────

function TextBlock({ s }: { s: SectionText }) {
  const html = sanitizeHtml(s.html ?? '')
  const pos = s.imagePosition ?? 'right'
  const img = s.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={s.imageUrl} alt={s.title ?? ''} loading="lazy" className={`rounded-2xl object-cover w-full ${pos === 'top' ? 'max-h-[420px]' : 'md:w-2/5'}`} />
  ) : null
  return (
    <>
      <Heading s={s} />
      <div className={`flex flex-col gap-6 ${pos === 'left' ? 'md:flex-row' : pos === 'right' ? 'md:flex-row-reverse' : ''}`}>
        {img}
        <div className="prose tiptap max-w-none min-w-0 flex-1 break-words" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </>
  )
}

function GalleryBlock({ s }: { s: SectionGallery }) {
  if (!s.images?.length) return null
  return (
    <>
      <Heading s={s} />
      <GalleryLightbox images={s.images} layout={s.layout} title={s.title} />
    </>
  )
}

export function VideoEmbed({ url, title, vertical }: { url: string; title?: string; vertical?: boolean }) {
  const embed = youtubeEmbedUrl(url)
  if (!embed) return null
  return (
    <div className={vertical ? 'mx-auto w-full max-w-[360px] aspect-[9/16]' : 'w-full aspect-video'}>
      <iframe src={embed} title={title || 'Vídeo'} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full rounded-2xl border-0 bg-black" />
    </div>
  )
}

function VideoBlock({ s }: { s: SectionVideo }) {
  if (!s.url) return null
  return (
    <>
      <Heading s={s} />
      <VideoEmbed url={s.url} title={s.title} vertical={s.vertical} />
      {s.caption && <p className="mt-2 text-sm text-gray-500 text-center">{s.caption}</p>}
    </>
  )
}

function ItemsBlock({ s }: { s: SectionItems }) {
  if (!s.items?.length) return null
  const cols = s.columns === 2 ? 'md:grid-cols-2' : s.columns === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3'
  const isList = s.layout === 'list'
  return (
    <>
      <Heading s={s} />
      <ul className={isList ? 'divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white' : `grid grid-cols-1 ${cols} gap-4`}>
        {s.items.map(it => {
          const text = it.text ? sanitizeHtml(it.text) : ''
          const meta = (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {it.address && (
                <a href={it.mapUrl || mapsSearchUrl(it.address)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#2563eb] hover:underline break-words">
                  <MapPin className="w-4 h-4 flex-shrink-0" /> {it.address}
                </a>
              )}
              {it.phone && <a href={`tel:${it.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 text-gray-700 hover:text-[#1e3a8a]"><Phone className="w-4 h-4" /> {it.phone}</a>}
              {it.videoUrl && <a href={it.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gray-700 hover:text-[#1e3a8a]"><PlayCircle className="w-4 h-4" /> Vídeo</a>}
            </div>
          )
          if (isList) {
            return (
              <li key={it.id} className="flex gap-3 p-3 sm:p-4 min-w-0">
                {it.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt={it.title} loading="lazy" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-gray-100" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[#1e3a8a] break-words">{it.link ? <a href={it.link} target="_blank" rel="noopener noreferrer" className="hover:underline">{it.title}</a> : it.title}</h3>
                    {it.badge && <span className="rounded-full bg-[#eff6ff] px-2 py-0.5 text-[11px] font-semibold text-[#1e3a8a]">{it.badge}</span>}
                  </div>
                  {text && <div className="mt-1 text-sm text-gray-600 break-words" dangerouslySetInnerHTML={{ __html: text }} />}
                  {meta}
                </div>
              </li>
            )
          }
          return (
            <li key={it.id} className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm min-w-0">
              {it.imageUrl && (
                <div className="relative aspect-[4/3] bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.imageUrl} alt={it.title} loading="lazy" className="h-full w-full object-cover" />
                  {it.badge && <span className="absolute left-3 top-3 rounded-full bg-[#ea580c] px-2.5 py-1 text-[11px] font-semibold text-white">{it.badge}</span>}
                </div>
              )}
              <div className="flex flex-1 flex-col p-4 min-w-0">
                {!it.imageUrl && it.badge && <span className={`${LABEL_CLS} mb-1`}>{it.badge}</span>}
                <h3 className="font-semibold text-[#1e3a8a] break-words">{it.title}</h3>
                {text && <div className="mt-1 text-sm text-gray-600 break-words" dangerouslySetInnerHTML={{ __html: text }} />}
                {meta}
                {it.images && it.images.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {it.images.map((im, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={`${im.url}-${i}`} src={im.url} alt={im.caption ?? ''} loading="lazy" className="h-16 w-20 flex-shrink-0 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
                {it.link && (
                  <a href={it.link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex w-fit items-center gap-1 rounded-full border border-[#1e3a8a] px-4 py-1.5 text-sm font-semibold text-[#1e3a8a] hover:bg-[#eff6ff]">
                    Saiba mais <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function TimelineBlock({ s }: { s: SectionTimeline }) {
  if (!s.entries?.length) return null
  return (
    <>
      <Heading s={s} />
      <ol className="relative border-l-2 border-[#bfdbfe] pl-6 space-y-8">
        {s.entries.map(e => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-4 border-white bg-[#ea580c] shadow" aria-hidden="true" />
            <p className="text-sm font-bold text-[#ea580c]">{e.year}</p>
            <h3 className="font-display text-lg font-semibold text-[#1e3a8a]">{e.title}</h3>
            {e.text && <div className="mt-1 text-gray-600 text-sm break-words" dangerouslySetInnerHTML={{ __html: sanitizeHtml(e.text) }} />}
            {e.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.imageUrl} alt={e.title} loading="lazy" className="mt-3 max-h-64 rounded-xl object-cover" />
            )}
          </li>
        ))}
      </ol>
    </>
  )
}

function PeopleBlock({ s }: { s: SectionPeople }) {
  if (!s.people?.length) return null
  return (
    <>
      <Heading s={s} />
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {s.people.map(p => (
          <li key={p.id} className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm min-w-0">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-[#eff6ff] flex items-center justify-center text-[#1e3a8a] font-bold">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
              ) : p.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[#1e3a8a] break-words">{p.link ? <a href={p.link} target="_blank" rel="noopener noreferrer" className="hover:underline">{p.name}</a> : p.name}</h3>
              {(p.role || p.period) && <p className="text-xs text-gray-500">{[p.role, p.period].filter(Boolean).join(' · ')}</p>}
              {p.text && <div className="mt-1 text-sm text-gray-600 break-words" dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.text) }} />}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function StatsBlock({ s }: { s: SectionStats }) {
  if (!s.stats?.length) return null
  return (
    <>
      <Heading s={s} />
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {s.stats.map(st => (
          <div key={st.id} className="rounded-2xl bg-[#eff6ff] p-4 min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-gray-500">{st.label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold text-[#1e3a8a] break-words">{st.value}</dd>
            {st.source && <p className="mt-1 text-[11px] text-gray-400">Fonte: {st.source}</p>}
          </div>
        ))}
      </dl>
    </>
  )
}

function MapBlock({ s }: { s: SectionMap }) {
  const embed = s.embedUrl && /^https:\/\/(www\.)?google\.[a-z.]+\/maps/i.test(s.embedUrl) ? s.embedUrl : null
  if (!embed && !s.pins?.length && !s.text) return null
  return (
    <>
      <Heading s={s} />
      {s.text && <p className="mb-4 text-gray-600">{s.text}</p>}
      {embed && (
        <div className="overflow-hidden rounded-2xl">
          <iframe src={embed} title={s.title || 'Mapa'} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen className="h-[360px] w-full border-0" />
        </div>
      )}
      {s.pins?.length > 0 && (
        <ul className={`mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2`}>
          {s.pins.map(p => {
            const q = p.address || (p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : p.name)
            return (
              <li key={p.id} className="flex items-start gap-2 rounded-xl bg-white border border-gray-100 p-3 text-sm min-w-0">
                <MapPin className="w-4 h-4 text-[#ea580c] mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <a href={mapsSearchUrl(q)} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1e3a8a] hover:underline break-words">{p.name}</a>
                  {p.category && <span className="ml-2 rounded-full bg-[#eff6ff] px-2 py-0.5 text-[11px] text-[#1e3a8a]">{p.category}</span>}
                  {p.address && <p className="text-gray-500 break-words">{p.address}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

// ─── Tipos com consulta ao banco ──────────────────────────────────────────

async function PropertiesBlock({ s, ctx }: { s: SectionProperties; ctx: SectionRenderContext }) {
  const names = s.cityNames?.length ? s.cityNames : (ctx.cityNames ?? [])
  const rows = await fetchPropertiesForSection({ mode: s.mode, names, ids: s.propertyIds ?? [], transactionType: s.transactionType, limit: s.limit ?? 8 })
  if (!rows.length) return null
  const query = names[0] ? `/imoveis?cidade=${encodeURIComponent(names[0])}` : '/imoveis'
  return (
    <>
      <Heading s={s} label="Imóveis" />
      <PropertyCarousel properties={rows} />
      <div className="mt-4">
        <Link href={query} className="inline-flex items-center gap-2 rounded-full border border-[#1e3a8a] px-4 py-2 text-sm font-semibold text-[#1e3a8a] hover:bg-[#eff6ff]">Ver todos os imóveis</Link>
      </div>
    </>
  )
}

export function EmpreendimentoCards({ items }: { items: EmpCard[] }) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(e => (
        <li key={e.id} className="min-w-0">
          <Link href={`/empreendimentos/${e.slug}`} className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="relative aspect-[4/3] bg-gray-100">
              {e.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.coverUrl} alt={e.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : <Building2 className="absolute inset-0 m-auto w-10 h-10 text-gray-300" />}
              <span className="absolute left-3 top-3 rounded-full bg-[#1e3a8a] px-2.5 py-1 text-[11px] font-semibold text-white">{STAGE_LABEL[e.stage] ?? e.stage}</span>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-[#1e3a8a] break-words">{e.name}</h3>
              <p className="text-sm text-gray-500">{[e.neighborhood, e.city].filter(Boolean).join(' · ')}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

async function EmpreendimentosBlock({ s, ctx }: { s: SectionEmpreendimentos; ctx: SectionRenderContext }) {
  const names = s.cityNames?.length ? s.cityNames : (ctx.cityNames ?? [])
  const rows = await fetchEmpreendimentosForSection({ mode: s.mode, names, ids: s.empreendimentoIds ?? [], limit: s.limit ?? 6 })
  if (!rows.length) return null
  return (
    <>
      <Heading s={s} label="Empreendimentos" />
      <EmpreendimentoCards items={rows} />
    </>
  )
}

export function CtaBlock({ s, ctx }: { s: SectionCta; ctx: SectionRenderContext }) {
  const style = s.style ?? 'orange'
  const wrap = style === 'orange' ? 'bg-[#ea580c] text-white' : style === 'blue' ? 'bg-[#1e3a8a] text-white' : 'bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe]'
  const btn = style === 'light' ? 'bg-[#ea580c] text-white hover:bg-[#c2410c]' : 'bg-white text-[#1e3a8a] hover:bg-[#F7F9FC]'
  const msg = s.whatsappMessage || `Olá! Quero falar sobre imóveis${ctx.pageName ? ` em ${ctx.pageName}` : ''}.`
  return (
    <div className={`rounded-3xl p-6 md:p-10 ${wrap}`}>
      <div className={`grid gap-8 ${s.showForm ? 'md:grid-cols-2' : ''}`}>
        <div>
          {s.title && <h2 className="font-display text-2xl md:text-3xl font-bold">{s.title}</h2>}
          {s.text && <p className={`mt-3 ${style === 'light' ? 'text-gray-700' : 'text-white/85'}`}>{s.text}</p>}
          <a href={waLink(ctx.whatsapp, msg)} target="_blank" rel="noopener noreferrer" className={`mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors ${btn}`}>
            <MessageCircle className="w-4 h-4" /> {s.buttonLabel || 'Falar no WhatsApp'}
          </a>
        </div>
        {s.showForm && (
          <div className="min-w-0 rounded-2xl bg-white p-5 text-gray-900 shadow-lg">
            <ContactForm whatsapp={ctx.whatsapp} whatsappMessage={msg} />
          </div>
        )}
      </div>
    </div>
  )
}

function FaqBlock({ s }: { s: SectionFaq }) {
  const entries = (s.entries ?? []).filter(e => e.question)
  if (!entries.length) return null
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: entries.map(e => ({ '@type': 'Question', name: e.question, acceptedAnswer: { '@type': 'Answer', text: e.answer.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() } })),
  }
  return (
    <>
      <Heading s={s} label="Dúvidas" />
      <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
        {entries.map(e => (
          <details key={e.id} className="group p-4">
            <summary className="cursor-pointer list-none font-semibold text-[#1e3a8a] flex justify-between gap-3 items-center">
              <span className="break-words">{e.question}</span>
              <span aria-hidden="true" className="text-[#ea580c] transition-transform group-open:rotate-45 text-xl leading-none">+</span>
            </summary>
            <div className="mt-2 text-sm text-gray-600 prose tiptap max-w-none break-words" dangerouslySetInnerHTML={{ __html: sanitizeHtml(e.answer) }} />
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}

async function BlogBlock({ s }: { s: SectionBlog }) {
  const posts = await fetchBlogForSection({ citySlug: s.citySlug, tag: s.tag, limit: s.limit ?? 3 })
  if (!posts.length) return null
  const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d) : '')
  return (
    <>
      <Heading s={s} label="Blog" />
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map(p => (
          <li key={p.id} className="min-w-0">
            <Link href={`/blog/${p.slug}`} className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow h-full">
              <div className="aspect-[16/9] bg-gray-100">
                {p.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverUrl} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500">{fmt(p.publishedAt)}{p.readingMinutes ? ` · ${p.readingMinutes} min` : ''}</p>
                <h3 className="mt-1 font-semibold text-[#1e3a8a] break-words">{p.title}</h3>
                {p.excerpt && <p className="mt-1 text-sm text-gray-600 line-clamp-3">{p.excerpt}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

// ─── Renderizador e índice ────────────────────────────────────────────────

async function renderOne(s: Section, ctx: SectionRenderContext) {
  switch (s.type) {
    case 'text': return <TextBlock s={s} />
    case 'gallery': return <GalleryBlock s={s} />
    case 'video': return <VideoBlock s={s} />
    case 'items': return <ItemsBlock s={s} />
    case 'timeline': return <TimelineBlock s={s} />
    case 'people': return <PeopleBlock s={s} />
    case 'stats': return <StatsBlock s={s} />
    case 'map': return <MapBlock s={s} />
    case 'properties': return <PropertiesBlock s={s} ctx={ctx} />
    case 'empreendimentos': return <EmpreendimentosBlock s={s} ctx={ctx} />
    case 'cta': return <CtaBlock s={s} ctx={ctx} />
    case 'faq': return <FaqBlock s={s} />
    case 'blog': return <BlogBlock s={s} />
  }
}

export async function SectionRenderer({ sections, context }: { sections: Section[]; context: SectionRenderContext }) {
  const visible = (sections ?? []).filter(s => s.visible !== false)
  return (
    <div className="space-y-14 min-w-0">
      {visible.map(s => (
        <section key={s.id} id={sectionAnchor(s)} className="scroll-mt-32 min-w-0">
          {renderOne(s, context)}
        </section>
      ))}
    </div>
  )
}

/** Índice lateral (desktop) com as seções visíveis que têm título. */
export function SectionIndex({ sections, title = 'Nesta página' }: { sections: Section[]; title?: string }) {
  const list = (sections ?? []).filter(s => s.visible !== false && s.title)
  if (list.length < 2) return null
  return (
    <nav aria-label={title} className="hidden lg:block sticky top-32 self-start w-60 flex-shrink-0">
      <p className={LABEL_CLS}>{title}</p>
      <ul className="mt-3 space-y-1 border-l-2 border-[#bfdbfe]">
        {list.map(s => (
          <li key={s.id}>
            <a href={`#${sectionAnchor(s)}`} className="block -ml-[2px] border-l-2 border-transparent pl-3 py-1 text-sm text-gray-600 hover:border-[#ea580c] hover:text-[#1e3a8a] break-words">{s.title}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
