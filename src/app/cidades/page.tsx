export const dynamic = 'force-dynamic'

/**
 * v1.3 — Hub público "Cidades do DF": capa + cards das cidades publicadas
 * (capa, nome, tagline, nº de imóveis ativos e link).
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Home, MapPinned } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { absUrl } from '@/lib/site'
import { countActiveProperties } from '@/lib/section-data'

export const metadata: Metadata = {
  title: 'Cidades do DF: guia de bairros e imóveis',
  description: 'Conheça as regiões administrativas do Distrito Federal: história, números, locais para visitar e imóveis à venda e para alugar em cada cidade.',
  alternates: { canonical: absUrl('/cidades') },
  openGraph: { title: 'Cidades do DF | Paulo Pop', description: 'Guia das cidades do Distrito Federal com imóveis à venda e para alugar.', url: absUrl('/cidades') },
}

export default async function CidadesHubPage() {
  const cities = await prisma.cityPage.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: { id: true, slug: true, name: true, tagline: true, coverUrl: true, matchNames: true },
  })
  const counts = await Promise.all(cities.map(c => countActiveProperties(c.matchNames.length ? c.matchNames : [c.name])))

  return (
    <>
      <section className="bg-[#1e3a8a] py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#93c5fd]">Guia do Distrito Federal</p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Cidades do DF</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
            História, números, o que visitar e os imóveis disponíveis em cada região administrativa, com a visão de quem vende e avalia imóveis por aqui.
          </p>
        </div>
      </section>

      <div className="bg-[#f6f7fb] py-12 min-h-[50vh]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {cities.length === 0 ? (
            <div className="rounded-2xl bg-white border border-dashed border-gray-200 p-16 text-center">
              <MapPinned className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">As páginas das cidades estão sendo preparadas. Volte em breve.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cities.map((c, i) => (
                <li key={c.id} className="min-w-0">
                  <Link href={`/cidades/${c.slug}`} className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                    <div className="relative aspect-[16/10] bg-[#eff6ff]">
                      {c.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.coverUrl} alt={`Foto de ${c.name}`} loading={i < 3 ? 'eager' : 'lazy'} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : <MapPinned className="absolute inset-0 m-auto w-12 h-12 text-[#93c5fd]" />}
                      {counts[i] > 0 && (
                        <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#1e3a8a] shadow">
                          <Home className="w-3.5 h-3.5" /> {counts[i]} {counts[i] === 1 ? 'imóvel' : 'imóveis'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="font-display text-xl font-bold text-[#1e3a8a]">{c.name}</h2>
                      {c.tagline && <p className="mt-1 text-sm text-gray-600 line-clamp-2">{c.tagline}</p>}
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#ea580c]">Conhecer {c.name} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></span>
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
