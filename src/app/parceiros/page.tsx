export const dynamic = 'force-dynamic'

/**
 * v1.3 — Hub público "Parceiros": filtro por tipo (?tipo=BANCO) e cards com logo, tipo, tagline e benefício.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BadgePercent, Handshake } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { absUrl } from '@/lib/site'
import { PARTNER_TYPES, PARTNER_TYPE_LABEL, partnerTypeLabel } from '@/lib/partners'

export const metadata: Metadata = {
  title: 'Parceiros: construtoras, bancos, cartórios e serviços',
  description: 'Rede de parceiros indicados por Paulo Pop no DF: construtoras, bancos e financiamento, cartórios, reforma, mudança e seguros, com condições especiais para clientes.',
  alternates: { canonical: absUrl('/parceiros') },
  openGraph: { title: 'Parceiros | Paulo Pop', description: 'Construtoras, bancos, cartórios e serviços indicados no DF.', url: absUrl('/parceiros') },
}

export default async function ParceirosHubPage({ searchParams }: { searchParams: { tipo?: string } }) {
  const tipo = PARTNER_TYPES.find(t => t === (searchParams.tipo ?? '').toUpperCase())
  const partners = await prisma.partner.findMany({
    where: { status: 'PUBLISHED', ...(tipo ? { type: tipo } : {}) },
    orderBy: [{ featured: 'desc' }, { order: 'asc' }, { name: 'asc' }],
    select: { id: true, slug: true, name: true, type: true, tagline: true, logoUrl: true, coverUrl: true, benefit: true, featured: true },
  })
  const typesPresent = await prisma.partner.findMany({ where: { status: 'PUBLISHED' }, distinct: ['type'], select: { type: true } })
  const availableTypes = PARTNER_TYPES.filter(t => typesPresent.some(x => x.type === t))

  return (
    <>
      <section className="bg-[#1e3a8a] py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#93c5fd]">Rede de confiança</p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Parceiros</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
            Construtoras, bancos, cartórios e serviços que trabalham comigo no dia a dia, com condições especiais para quem compra, vende ou aluga com o Paulo Pop.
          </p>
        </div>
      </section>

      <div className="bg-[#f6f7fb] py-12 min-h-[50vh]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {availableTypes.length > 1 && (
            <nav aria-label="Filtrar por tipo" className="flex gap-2 overflow-x-auto pb-2 mb-8 [scrollbar-width:thin]">
              <Link href="/parceiros" className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap ${!tipo ? 'bg-[#1e3a8a] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-[#1e3a8a]'}`}>Todos</Link>
              {availableTypes.map(t => (
                <Link key={t} href={`/parceiros?tipo=${t}`} className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap ${tipo === t ? 'bg-[#1e3a8a] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-[#1e3a8a]'}`}>{PARTNER_TYPE_LABEL[t]}</Link>
              ))}
            </nav>
          )}

          {partners.length === 0 ? (
            <div className="rounded-2xl bg-white border border-dashed border-gray-200 p-16 text-center">
              <Handshake className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Nenhum parceiro publicado{tipo ? ` em ${PARTNER_TYPE_LABEL[tipo]}` : ''} ainda.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map(p => (
                <li key={p.id} className="min-w-0">
                  <Link href={`/parceiros/${p.slug}`} className="group flex h-full flex-col rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
                    <div className="relative h-28 bg-[#eff6ff] flex items-center justify-center p-4">
                      {p.coverUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.coverUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-30" />
                      )}
                      {p.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.logoUrl} alt={p.name} loading="lazy" className="relative max-h-16 max-w-[70%] object-contain" />
                      ) : <Handshake className="relative w-10 h-10 text-[#93c5fd]" />}
                      {p.featured && <span className="absolute left-4 top-4 rounded-full bg-[#ea580c] px-2.5 py-1 text-[11px] font-semibold text-white">Destaque</span>}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">{partnerTypeLabel(p.type)}</p>
                      <h2 className="font-display text-xl font-bold text-[#1e3a8a] break-words">{p.name}</h2>
                      {p.tagline && <p className="mt-1 text-sm text-gray-600 line-clamp-2">{p.tagline}</p>}
                      {p.benefit && (
                        <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#fff7ed] px-3 py-2 text-sm text-[#9a3412] line-clamp-3">
                          <BadgePercent className="w-4 h-4 mt-0.5 flex-shrink-0" /> {p.benefit}
                        </p>
                      )}
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#ea580c]">Ver parceiro <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
