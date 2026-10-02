export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PropertyCard } from '@/components/public/PropertyCard'
import { PropertyFilters } from '@/components/public/PropertyFilters'
import { HomeSearch } from '@/components/public/HomeSearch'
import { PropertyMapSearch } from '@/components/public/PropertyMapSearch'
import { Search, Map as MapIcon, LayoutGrid } from 'lucide-react'
import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import { CARD_SELECT, toCard } from '@/lib/section-data'
import { sortByRelevance } from '@/lib/property-search'
import { buildWhere, searchText, type SearchParams } from '@/lib/property-filters'
import { getSiteConfigCached, getActiveCitiesCached } from '@/lib/cache'
import { getPublishedCityLinksCached } from '@/lib/city-pages'

export const metadata: Metadata = {
  title: 'Imóveis à venda e para alugar no DF',
  alternates: { canonical: '/imoveis' },
  description: 'Encontre apartamentos, casas, terrenos e muito mais. Filtre por localização, preço, tipo e características.',
}

const PAGE_SIZE = 12

/** Converte SearchParams para Record<string,string> ignorando arrays (feature) */
function spToRecord(sp: SearchParams, overrides: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') result[k] = v
  }
  return { ...result, ...overrides }
}

function buildOrderBy(ordem?: string): Prisma.PropertyOrderByWithRelationInput {
  switch (ordem) {
    case 'menor-preco': return { price: 'asc' }
    case 'maior-preco': return { price: 'desc' }
    case 'maior-area': return { totalArea: 'desc' }
    default: return { createdAt: 'desc' }
  }
}

async function PropertyGrid({ searchParams, whatsapp }: { searchParams: SearchParams; whatsapp?: string | null }) {
  const page = Math.max(1, parseInt(searchParams.pagina ?? '1'))
  const skip = (page - 1) * PAGE_SIZE

  const where = buildWhere(searchParams)
  const orderBy = buildOrderBy(searchParams.ordem)
  const text = searchText(searchParams)

  const [rows, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy,
      // v1.3: select do card (ref, fotos do carrossel, histórico de preço)
      select: CARD_SELECT,
    }),
    prisma.property.count({ where }),
  ])
  // v1.3: relevância simples — acerto exato na ref primeiro
  const properties = (text ? sortByRelevance(rows, text) : rows).map(toCard)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (properties.length === 0) {
    return (
      <div className="text-center py-20">
        <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum imóvel encontrado</h3>
        <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {properties.map((p, i) => (
          <PropertyCard key={p.id} {...p} whatsapp={whatsapp} priority={i < 3} />
        ))}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <nav className="flex justify-center gap-2 mt-10" aria-label="Paginação">
          {page > 1 && (
            <Link
              href={`?${new URLSearchParams(spToRecord(searchParams, { pagina: String(page - 1) }))}`}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:border-[#1e3a8a] hover:text-[#1e3a8a] transition-colors"
              aria-label="Página anterior"
            >
              ‹
            </Link>
          )}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p2 = i + 1
            return (
              <Link
                key={p2}
                href={`?${new URLSearchParams(spToRecord(searchParams, { pagina: String(p2) }))}`}
                className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  p2 === page
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1e3a8a] hover:text-[#1e3a8a]'
                }`}
                aria-current={p2 === page ? 'page' : undefined}
              >
                {p2}
              </Link>
            )
          })}
          {page < totalPages && (
            <Link
              href={`?${new URLSearchParams(spToRecord(searchParams, { pagina: String(page + 1) }))}`}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:border-[#1e3a8a] hover:text-[#1e3a8a] transition-colors"
              aria-label="Próxima página"
            >
              ›
            </Link>
          )}
        </nav>
      )}

      <p className="text-center text-sm text-gray-400 mt-4">
        {total} {total !== 1 ? 'imóveis' : 'imóvel'} encontrado{total !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

// v1.1: cidades e bairros dos imóveis publicados, para o filtro de localização
async function loadLocations() {
  const rows = await prisma.property.findMany({
    where: { status: 'ACTIVE', hideOnSite: false, city: { not: null } },
    select: { city: true, neighborhood: true },
    distinct: ['city', 'neighborhood'],
    orderBy: [{ city: 'asc' }, { neighborhood: 'asc' }],
  })
  return Object.values(
    rows.reduce<Record<string, { city: string; neighborhoods: string[] }>>((acc, r) => {
      const city = (r.city ?? '').replace(/\s*-\s*DF$/i, '').trim()
      if (!city) return acc
      acc[city] ??= { city, neighborhoods: [] }
      if (r.neighborhood && !acc[city].neighborhoods.includes(r.neighborhood)) acc[city].neighborhoods.push(r.neighborhood)
      return acc
    }, {})
  )
}

export default async function ImoveisPage({ searchParams }: { searchParams: SearchParams }) {
  const [locations, config, activeCities, cityLinks] = await Promise.all([
    loadLocations(),
    getSiteConfigCached().catch(() => null),
    getActiveCitiesCached().catch(() => [] as string[]),
    getPublishedCityLinksCached().catch(() => []),
  ])
  const whatsapp = config?.ownerWhatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP ?? null
  const text = searchText(searchParams)
  const regions = Array.from(new Set([...cityLinks.map(c => c.name), ...activeCities])).slice(0, 8)
  const defaultTab = searchParams.transacao === 'alugar' ? 'alugar' : 'comprar'
  // v1.5: modo mapa (o mapa fica acima da lista; os dois usam os mesmos filtros)
  const mapMode = searchParams.modo === 'mapa'
  const baseQuery = new URLSearchParams(spToRecord(searchParams, {}))
  for (const f of Array.isArray(searchParams.feature) ? searchParams.feature : []) baseQuery.append('feature', f)
  const toggleHref = (() => {
    const q = new URLSearchParams(baseQuery)
    q.delete('pagina')
    if (mapMode) { q.delete('modo'); q.delete('area') } else q.set('modo', 'mapa')
    const s = q.toString()
    return `/imoveis${s ? `?${s}` : ''}`
  })()
  const sortOptions = [
    { value: 'recente', label: 'Mais recente' },
    { value: 'menor-preco', label: 'Menor preço' },
    { value: 'maior-preco', label: 'Maior preço' },
    { value: 'maior-area', label: 'Maior área' },
  ]

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* Header da listagem */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#1e3a8a] mb-4">
            {text ? `Resultados para "${text}"` : 'Todos os Imóveis'}
          </h1>

          {/* v1.3: busca por texto único (modo compacto) */}
          <div className="max-w-3xl">
            <HomeSearch compact tone="light" regions={regions} defaultQuery={text} defaultTab={defaultTab} />
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar de filtros */}
          <PropertyFilters mode="sidebar" locations={locations} />

          {/* Resultados */}
          <div className="flex-1 min-w-0">
            {/* Ordenação e filtros mobile */}
            <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
              <PropertyFilters mode="mobile" locations={locations} />

              {/* v1.5: alternar lista / mapa */}
              <Link href={toggleHref} scroll={false}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e3a8a] bg-white px-3 py-2 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white transition-colors"
                aria-label={mapMode ? 'Ver só a lista' : 'Ver imóveis no mapa'}>
                {mapMode ? <><LayoutGrid className="h-4 w-4" /> Lista</> : <><MapIcon className="h-4 w-4" /> Mapa</>}
              </Link>

              <div className="flex items-center gap-2 ml-auto">
                <label className="text-xs text-gray-500 hidden sm:block" htmlFor="ordem">
                  Ordenar:
                </label>
                <form method="GET">
                  {/* Preservar outros params */}
                  {Object.entries(searchParams).filter(([k]) => k !== 'ordem').map(([k, v]) =>
                    Array.isArray(v)
                      ? v.map((val, i) => <input key={`${k}-${i}`} type="hidden" name={k} value={val} />)
                      : <input key={k} type="hidden" name={k} value={v as string} />
                  )}
                  <select
                    id="ordem"
                    name="ordem"
                    defaultValue={searchParams.ordem ?? 'recente'}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    aria-label="Ordenar imóveis"
                  >
                    {sortOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="ml-2 px-3 py-2 text-sm font-medium rounded-lg border border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white transition-colors"
                  >
                    Aplicar
                  </button>
                </form>
              </div>
            </div>

            {mapMode && <PropertyMapSearch query={baseQuery.toString()} />}

            <Suspense fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="h-72 bg-white rounded-2xl animate-pulse" />
                ))}
              </div>
            }>
              <PropertyGrid searchParams={searchParams} whatsapp={whatsapp} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
