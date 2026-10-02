export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Plus, Building2, Search, Globe, FileText } from 'lucide-react'
import { EmpreendimentoRowActions } from '@/components/admin/EmpreendimentoRowActions'

interface SearchParams { q?: string; page?: string }

async function EmpreendimentosTable({ searchParams }: { searchParams: SearchParams }) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const pageSize = 20
  const skip = (page - 1) * pageSize

  const where = searchParams.q
    ? { name: { contains: searchParams.q, mode: 'insensitive' as const } }
    : {}

  const [items, total] = await Promise.all([
    prisma.empreendimento.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        images: { where: { category: 'FACHADA' }, take: 1, orderBy: { order: 'asc' } },
        _count: { select: { properties: true } }, // v1.5: menu de ações
      },
    }),
    prisma.empreendimento.count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-sm text-gray-500">
        <span>{total} empreendimento{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</span>
        {totalPages > 1 && <span>Página {page} de {totalPages}</span>}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum empreendimento encontrado</p>
          <p className="text-sm text-gray-400 mt-1">Cadastre seu primeiro empreendimento.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Empreendimento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cidade</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidades</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(e => {
                  const cover = e.coverUrl ?? e.images[0]?.url
                  const isPublished = e.status === 'PUBLISHED'
                  return (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                            {cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={cover} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="w-6 h-6 m-auto mt-2 text-gray-300" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{e.name}</p>
                            {e.tagline && <p className="text-xs text-gray-400 truncate max-w-xs">{e.tagline}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.city ?? '—'}{e.state ? `, ${e.state}` : ''}</td>
                      <td className="px-4 py-3 text-gray-600">{e.totalUnits ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {isPublished ? <><Globe className="w-3 h-3" />Publicado</> : <><FileText className="w-3 h-3" />Rascunho</>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <EmpreendimentoRowActions id={e.id} slug={e.slug} name={e.name} published={isPublished} linkedCount={e._count.properties} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {items.map(e => (
              <div key={e.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <Link href={`/admin/empreendimentos/${e.id}`} className="block">
                  <p className="truncate text-sm font-medium text-gray-800">{e.name}</p>
                  <p className="text-xs text-gray-400">
                    {e.city ?? ''}{e.city ? ' · ' : ''}{e.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'} · {e._count.properties} {e._count.properties === 1 ? 'imóvel' : 'imóveis'}
                  </p>
                </Link>
                <EmpreendimentoRowActions variant="buttons" id={e.id} slug={e.slug} name={e.name} published={e.status === 'PUBLISHED'} linkedCount={e._count.properties} />
              </div>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1
            return (
              <Link key={p} href={`?${new URLSearchParams({ ...searchParams, page: String(p) })}`}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-[#1e3a8a] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                {p}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AdminEmpreendimentosPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a8a]">Empreendimentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Lançamentos e projetos imobiliários</p>
        </div>
        <Link href="/admin/empreendimentos/novo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white text-sm font-medium rounded-lg hover:bg-[#172554] transition-colors">
          <Plus className="w-4 h-4" />Novo Empreendimento
        </Link>
      </div>
      <form method="GET" className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" name="q" defaultValue={searchParams.q} placeholder="Buscar por nome..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white" />
        </div>
        <button type="submit" className="px-4 py-2 bg-[#2563eb] text-white text-sm font-medium rounded-lg hover:bg-[#1d4ed8] transition-colors">Filtrar</button>
      </form>
      <Suspense fallback={<div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">Carregando...</div>}>
        <EmpreendimentosTable searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
