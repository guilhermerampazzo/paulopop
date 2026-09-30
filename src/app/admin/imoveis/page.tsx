export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Link2, Plus, Search } from 'lucide-react'
import { ImoveisTableClient } from '@/components/admin/ImoveisTableClient'
import { getSessionUser, propertyScope } from '@/lib/authz'

interface SearchParams {
  q?: string
  status?: string
  page?: string
}

async function PropertiesTable({ searchParams }: { searchParams: SearchParams }) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const pageSize = 20
  const skip = (page - 1) * pageSize

  // Corretor comum só vê os próprios imóveis; administradores veem todos
  const user = await getSessionUser()
  const where = {
    ...(user ? propertyScope(user) : { id: '__none__' }),
    ...(searchParams.q
      ? {
          OR: [
            { ref: { contains: searchParams.q, mode: 'insensitive' as const } },
            { title: { contains: searchParams.q, mode: 'insensitive' as const } },
            { address: { contains: searchParams.q, mode: 'insensitive' as const } },
            { city: { contains: searchParams.q, mode: 'insensitive' as const } },
            { neighborhood: { contains: searchParams.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(searchParams.status ? { status: searchParams.status as never } : {}),
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ref: true,
        title: true,
        slug: true,
        propertyType: true,
        status: true,
        transactionType: true,
        price: true,
        totalArea: true,
        city: true,
        state: true,
        neighborhood: true,
        createdAt: true,
        images: {
          take: 1,
          select: { thumbnailUrl: true, url: true },
          orderBy: { order: 'asc' },
        },
        agent: { select: { name: true } },
      },
    }),
    prisma.property.count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  // Serializar para JSON-safe (Decimal → string, Date → string)
  const rows = JSON.parse(
    JSON.stringify(properties, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    )
  )

  return (
    <ImoveisTableClient
      properties={rows}
      total={total}
      page={page}
      totalPages={totalPages}
      searchParams={Object.fromEntries(
        Object.entries(searchParams).filter(([, v]) => v !== undefined) as [string, string][]
      )}
    />
  )
}

export default function AdminImoveisPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'DRAFT', label: 'Rascunho' },
    { value: 'ACTIVE', label: 'Ativo' },
    { value: 'SOLD', label: 'Vendido' },
    { value: 'RENTED', label: 'Alugado' },
    { value: 'INACTIVE', label: 'Inativo' },
    { value: 'SUSPENDED', label: 'Suspenso' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a8a]">Imóveis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie todos os imóveis cadastrados</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/imoveis/importar"
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#1e3a8a] text-[#1e3a8a] text-sm font-medium rounded-lg hover:bg-[#1e3a8a] hover:text-white transition-colors"
          >
            <Link2 className="w-4 h-4" />
            Importar anúncio
          </Link>
          <Link
            href="/admin/imoveis/novo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white text-sm font-medium rounded-lg hover:bg-[#172554] transition-colors"
            aria-label="Cadastrar novo imóvel"
          >
            <Plus className="w-4 h-4" />
            Novo Imóvel
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <form method="GET" className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Buscar por ref, título, endereço, cidade..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white"
            aria-label="Buscar imóveis"
          />
        </div>
        <select
          name="status"
          defaultValue={searchParams.status ?? ''}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] text-gray-700"
          aria-label="Filtrar por status"
        >
          {statusOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-[#2563eb] text-white text-sm font-medium rounded-lg hover:bg-[#1d4ed8] transition-colors"
        >
          Filtrar
        </button>
      </form>

      {/* Tabela */}
      <Suspense fallback={
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Carregando imóveis...
        </div>
      }>
        <PropertiesTable searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
