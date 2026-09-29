export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { Badge, leadStatusBadge, leadStatusLabel } from '@/components/ui/Badge'
import { formatDate } from '@/lib/formatters'
import { Users, Search, MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface SearchParams {
  q?: string
  status?: string
  page?: string
}

const sourceLabels: Record<string, string> = {
  SITE: 'Site',
  WHATSAPP: 'WhatsApp',
  PORTAL: 'Portal',
  REFERRAL: 'Indicação',
  MANUAL: 'Manual',
}

async function LeadsTable({ searchParams }: { searchParams: SearchParams }) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const pageSize = 25
  const skip = (page - 1) * pageSize

  const where = {
    ...(searchParams.q
      ? {
          OR: [
            { name: { contains: searchParams.q, mode: 'insensitive' as const } },
            { email: { contains: searchParams.q, mode: 'insensitive' as const } },
            { phone: { contains: searchParams.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(searchParams.status ? { status: searchParams.status as never } : {}),
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { ref: true, id: true, title: true } },
        agent: { select: { name: true } },
      },
    }),
    prisma.lead.count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-sm text-gray-500">
        <span>{total} lead{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</span>
        {totalPages > 1 && <span>Página {page} de {totalPages}</span>}
      </div>

      {leads.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum lead encontrado</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contato</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Imóvel</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Origem</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Corretor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{lead.name}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{lead.email ?? '—'}</p>
                      <p className="text-xs text-gray-400">{lead.phone ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      {lead.property ? (
                        <Link
                          href={`/admin/imoveis/${lead.property.id}`}
                          className="text-[#1e3a8a] hover:underline text-xs"
                        >
                          {lead.property.ref}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {sourceLabels[lead.source] ?? lead.source}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={leadStatusBadge[lead.status]} size="sm">
                        {leadStatusLabel[lead.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {lead.agent?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {formatDate(lead.createdAt.toISOString())}
                    </td>
                    <td className="px-4 py-3">
                      {lead.message && (
                        <span
                          title={lead.message}
                          aria-label="Ver mensagem"
                          className="text-gray-400 hover:text-gray-600 cursor-default"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {leads.map(lead => (
              <div key={lead.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{lead.name}</p>
                    <p className="text-xs text-gray-400">{lead.email}</p>
                    {lead.phone && <p className="text-xs text-gray-400">{lead.phone}</p>}
                  </div>
                  <Badge variant={leadStatusBadge[lead.status]} size="sm">
                    {leadStatusLabel[lead.status]}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span>{sourceLabels[lead.source] ?? lead.source}</span>
                  {lead.property && (
                    <>
                      <span>•</span>
                      <Link href={`/admin/imoveis/${lead.property.id}`} className="text-[#1e3a8a]">
                        {lead.property.ref}
                      </Link>
                    </>
                  )}
                  <span>•</span>
                  <span>{formatDate(lead.createdAt.toISOString())}</span>
                </div>
                {lead.message && (
                  <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-md p-2 line-clamp-2">
                    {lead.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p2 = i + 1
            return (
              <Link
                key={p2}
                href={`?${new URLSearchParams({ ...searchParams, page: String(p2) })}`}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  p2 === page
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1e3a8a] hover:text-[#1e3a8a]'
                }`}
              >
                {p2}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AdminContatosPage({ searchParams }: { searchParams: SearchParams }) {
  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'NEW', label: 'Novo' },
    { value: 'CONTACTED', label: 'Contatado' },
    { value: 'QUALIFIED', label: 'Qualificado' },
    { value: 'PROPOSAL', label: 'Proposta' },
    { value: 'CLOSED', label: 'Fechado' },
    { value: 'PERDIDO', label: 'Perdido' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e3a8a]">Contatos & Leads</h1>
        <p className="text-sm text-gray-500 mt-0.5">CRM de leads e contatos recebidos</p>
      </div>

      {/* Filtros */}
      <form method="GET" className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Buscar por nome, email ou telefone..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white"
            aria-label="Buscar leads"
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

      <Suspense fallback={
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Carregando leads...
        </div>
      }>
        <LeadsTable searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
