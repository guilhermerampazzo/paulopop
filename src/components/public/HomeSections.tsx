/**
 * v1.3 — Seções server da home: Empreendimentos (ordenados por estágio), Regiões (cidades publicadas
 * com preço médio do m² e nº de imóveis), Números (vendidos, tempo médio, anos) e "Como funciona".
 */
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Building2, MapPin, Search, Handshake, KeyRound, ClipboardCheck, Camera, BadgeCheck, TrendingUp, Clock, Award, Home } from 'lucide-react'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { TAGS } from '@/lib/cache'
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/empreendimento-units'
import { averageSqmPrice, countActiveProperties } from '@/lib/section-data'
import { formatCurrency } from '@/lib/formatters'
import { formatDuration } from '@/lib/sales'

export const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.28em] text-[#2563eb]'
export const H2 = 'mt-3 font-display text-3xl md:text-4xl font-bold text-[#1e3a8a]'

// ─── Empreendimentos ────────────────────────────────────────────────────────
const getHomeEmpreendimentos = unstable_cache(
  async () => {
    const rows = await prisma.empreendimento.findMany({
      where: { status: 'PUBLISHED' },
      take: 12,
      select: {
        id: true, slug: true, name: true, tagline: true, stage: true, city: true, neighborhood: true, coverUrl: true, deliveryYear: true, priceMin: true,
        images: { where: { category: 'FACHADA' }, take: 1, orderBy: { order: 'asc' }, select: { url: true } },
        _count: { select: { properties: { where: { status: 'ACTIVE', hideOnSite: false } } } },
      },
    })
    return rows
      .sort((a, b) => (STAGE_ORDER[a.stage] ?? 9) - (STAGE_ORDER[b.stage] ?? 9) || (b.deliveryYear ?? 0) - (a.deliveryYear ?? 0))
      .slice(0, 6)
      .map(e => ({ ...e, priceMin: e.priceMin ? Number(e.priceMin) : null, cover: e.coverUrl ?? e.images[0]?.url ?? null, units: e._count.properties }))
  },
  ['home-empreendimentos'],
  { revalidate: 60, tags: [TAGS.empreendimentos, TAGS.properties] }
)

export async function HomeEmpreendimentos() {
  const items = await getHomeEmpreendimentos().catch(() => [])
  if (!items.length) return null
  return (
    <section className="bg-white py-16 md:py-20" aria-labelledby="home-emp-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className={EYEBROW}>Empreendimentos</p>
            <h2 id="home-emp-title" className={H2}>Prédios que eu conheço de perto</h2>
            <p className="mt-3 text-base leading-7 text-slate-600">Lançamentos, obras e prédios prontos com unidades à venda, histórico e comparação por andar.</p>
          </div>
          <Link href="/empreendimentos" className="inline-flex items-center gap-2 self-start rounded-full border border-[#1e3a8a]/10 bg-white px-5 py-3 text-sm font-semibold text-[#1e3a8a] transition hover:border-[#2563eb] hover:text-[#2563eb]">
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(e => (
            <Link key={e.id} href={`/empreendimentos/${e.slug}`} className="group overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-shadow" aria-label={`Ver empreendimento ${e.name}`}>
              <div className="relative h-48 bg-gray-100">
                {e.cover ? (
                  <Image src={e.cover} alt={e.name} fill loading="lazy" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#1e3a8a] to-[#2563eb]"><Building2 className="w-10 h-10 text-white/40" /></div>
                )}
                <span className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-bold ${e.stage === 'LANCAMENTO' ? 'bg-[#ea580c] text-white' : e.stage === 'EM_OBRAS' ? 'bg-amber-400 text-amber-950' : 'bg-white/90 text-[#1e3a8a]'}`}>
                  {STAGE_LABEL[e.stage] ?? e.stage}
                </span>
                {e.units > 0 && <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">{e.units} à venda</span>}
              </div>
              <div className="p-5">
                {(e.neighborhood || e.city) && <p className="flex items-center gap-1 text-xs font-semibold text-[#2563eb]"><MapPin className="w-3 h-3" />{[e.neighborhood, e.city].filter(Boolean).join(', ')}</p>}
                <h3 className="mt-1 font-display text-xl font-bold text-[#1e3a8a] group-hover:text-[#2563eb]">{e.name}</h3>
                {e.tagline && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{e.tagline}</p>}
                {e.priceMin && <p className="mt-3 text-sm font-semibold text-[#1e3a8a]">A partir de {formatCurrency(e.priceMin)}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Regiões ────────────────────────────────────────────────────────────────
const getHomeRegions = unstable_cache(
  async () => {
    const pages = await prisma.cityPage.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      take: 8,
      select: { slug: true, name: true, tagline: true, coverUrl: true, matchNames: true },
    })
    return Promise.all(pages.map(async p => {
      const names = p.matchNames.length ? p.matchNames : [p.name]
      const [avg, count] = await Promise.all([averageSqmPrice(names), countActiveProperties(names)])
      return { ...p, avgSqm: avg, count }
    }))
  },
  ['home-regions'],
  { revalidate: 60, tags: [TAGS.config, TAGS.properties] }
)

export async function HomeRegions() {
  const regions = await getHomeRegions().catch(() => [])
  if (!regions.length) return null
  return (
    <section className="bg-[#f6f7fb] py-16 md:py-20" aria-labelledby="home-regioes-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <p className={EYEBROW}>Regiões</p>
          <h2 id="home-regioes-title" className={H2}>Onde eu atuo no DF</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">Preço médio do m² calculado dos anúncios ativos e o que cada região oferece para morar.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {regions.map(r => (
            <Link key={r.slug} href={`/cidades/${r.slug}`} className="group relative overflow-hidden rounded-2xl bg-[#1e3a8a] text-white min-h-[180px] flex flex-col justify-end p-5" aria-label={`Imóveis em ${r.name}`}>
              {r.coverUrl && <Image src={r.coverUrl} alt="" fill loading="lazy" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px" className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" />}
              <div className="absolute inset-0 bg-gradient-to-t from-[#07172f] via-[#07172f]/50 to-transparent" aria-hidden="true" />
              <div className="relative">
                <h3 className="font-display text-2xl font-bold">{r.name}</h3>
                {r.tagline && <p className="text-xs text-white/75 line-clamp-1">{r.tagline}</p>}
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-[#93c5fd]">
                  {r.avgSqm && <span>{formatCurrency(Math.round(r.avgSqm))}/m²</span>}
                  <span>{r.count} {r.count === 1 ? 'imóvel' : 'imóveis'}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Números ────────────────────────────────────────────────────────────────
const getHomeStats = unstable_cache(
  async () => {
    const [sold, avg] = await Promise.all([
      prisma.property.count({ where: { status: { in: ['SOLD', 'RENTED'] } } }),
      prisma.property.aggregate({ where: { status: { in: ['SOLD', 'RENTED'] }, daysOnMarket: { not: null } }, _avg: { daysOnMarket: true } }),
    ])
    return { sold, avgDays: avg._avg.daysOnMarket != null ? Math.round(avg._avg.daysOnMarket) : null }
  },
  ['home-stats'],
  { revalidate: 60, tags: [TAGS.properties] }
)

export async function HomeStats({ activeCount }: { activeCount?: number }) {
  const s = await getHomeStats().catch(() => ({ sold: 0, avgDays: null as number | null }))
  const years = new Date().getFullYear() - 2009
  const items = [
    { icon: <Award className="w-5 h-5" />, value: `${years}+`, label: 'anos de experiência' },
    ...(s.sold > 0 ? [{ icon: <BadgeCheck className="w-5 h-5" />, value: String(s.sold), label: s.sold === 1 ? 'imóvel vendido ou alugado' : 'imóveis vendidos ou alugados' }] : []),
    ...(s.avgDays != null ? [{ icon: <Clock className="w-5 h-5" />, value: formatDuration(s.avgDays), label: 'tempo médio de venda' }] : []),
    ...(activeCount ? [{ icon: <Home className="w-5 h-5" />, value: String(activeCount), label: 'imóveis disponíveis' }] : []),
  ]
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(it => (
        <div key={it.label} className="rounded-2xl bg-white/10 border border-white/10 p-4 text-white">
          <span className="text-[#93c5fd]">{it.icon}</span>
          <p className="mt-2 font-display text-2xl md:text-3xl font-bold leading-tight">{it.value}</p>
          <p className="text-xs text-slate-200">{it.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Como funciona ──────────────────────────────────────────────────────────
export function HomeHowItWorks() {
  const buyer = [
    { icon: <Search className="w-5 h-5" />, title: 'Conte o que procura', text: 'Região, orçamento e momento de vida. Eu filtro o que faz sentido.' },
    { icon: <KeyRound className="w-5 h-5" />, title: 'Visitas que valem a pena', text: 'Poucas opções, bem escolhidas, com leitura do prédio e da vizinhança.' },
    { icon: <Handshake className="w-5 h-5" />, title: 'Negociação e chaves', text: 'Proposta, crédito, cartório e acompanhamento até a entrega das chaves.' },
  ]
  const owner = [
    { icon: <ClipboardCheck className="w-5 h-5" />, title: 'Avaliação gratuita', text: 'Estudo de mercado com imóveis comparáveis e preço realista de venda.' },
    { icon: <Camera className="w-5 h-5" />, title: 'Anúncio profissional', text: 'Fotos, vídeo e divulgação na rede RE/MAX e nos principais portais.' },
    { icon: <TrendingUp className="w-5 h-5" />, title: 'Venda acompanhada', text: 'Relatório de desempenho, visitas qualificadas e negociação até a escritura.' },
  ]
  const col = (title: string, items: typeof buyer, href: string, cta: string) => (
    <div className="rounded-[28px] bg-white p-6 md:p-8 shadow-[0_18px_50px_-40px_rgba(8,30,63,0.45)]">
      <h3 className="font-display text-2xl font-bold text-[#1e3a8a]">{title}</h3>
      <ol className="mt-6 space-y-5">
        {items.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-[#1e3a8a]">{s.icon}</span>
            <div>
              <p className="text-sm font-semibold text-[#1e3a8a]"><span className="text-[#ea580c] mr-1">{i + 1}.</span>{s.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href={href} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1e3a8a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#172554]">{cta} <ArrowRight className="h-4 w-4" /></Link>
    </div>
  )
  return (
    <section className="bg-[#f6f7fb] py-16 md:py-20" aria-labelledby="como-funciona-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <p className={EYEBROW}>Como funciona</p>
          <h2 id="como-funciona-title" className={H2}>Três passos para comprar. Três para vender.</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {col('Para quem vai comprar', buyer, '/imoveis', 'Começar a busca')}
          {col('Para quem vai vender', owner, '/vender', 'Pedir avaliação grátis')}
        </div>
      </div>
    </section>
  )
}
