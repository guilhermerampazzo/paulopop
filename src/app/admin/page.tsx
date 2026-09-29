export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import {
  Badge,
  propertyStatusBadge,
  propertyStatusLabel,
  leadStatusBadge,
  leadStatusLabel,
} from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Building2, Users, TrendingUp, CheckCircle } from 'lucide-react'
import { DashboardCharts } from '@/components/admin/DashboardCharts'

async function getDashboardData() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    activeProperties,
    newLeads,
    publishedThisMonth,
    soldRented,
    recentProperties,
    recentLeads,
    propertiesByStatus,
    leadsPerMonth,
  ] = await Promise.all([
    prisma.property.count({ where: { status: 'ACTIVE' } }),
    prisma.lead.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.property.count({ where: { publishedAt: { gte: startOfMonth } } }),
    prisma.property.count({ where: { status: { in: ['SOLD', 'RENTED'] } } }),
    prisma.property.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, ref: true, propertyType: true, city: true, state: true,
        status: true, transactionType: true, price: true, createdAt: true,
      },
    }),
    prisma.lead.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, phone: true, source: true, status: true, createdAt: true,
        property: { select: { ref: true, title: true, propertyType: true } },
      },
    }),
    prisma.property.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    // Leads dos últimos 6 meses para o gráfico
    prisma.lead.findMany({
      where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
      select: { createdAt: true },
    }),
  ])

  // Processar leads por mês (últimos 6 meses)
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const leadsMonthMap: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`
    leadsMonthMap[key] = 0
  }
  leadsPerMonth.forEach((lead) => {
    const d = new Date(lead.createdAt)
    const key = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`
    if (key in leadsMonthMap) leadsMonthMap[key]++
  })
  const leadsChartData = Object.entries(leadsMonthMap).map(([month, total]) => ({ month, total }))

  // Processar imóveis por status para o donut
  const statusChartData = propertiesByStatus.map((s) => ({
    name: propertyStatusLabel[s.status] ?? s.status,
    value: s._count.status,
    status: s.status,
  }))

  return {
    stats: { activeProperties, newLeads, publishedThisMonth, soldRented },
    recentProperties,
    recentLeads,
    leadsChartData,
    statusChartData,
  }
}

const transactionLabel: Record<string, string> = { SALE: 'Venda', RENT: 'Aluguel' }
const sourceLabel: Record<string, string> = {
  SITE: 'Site', WHATSAPP: 'WhatsApp', PORTAL: 'Portal', REFERRAL: 'Indicação', MANUAL: 'Manual',
}
const sourceBadge: Record<string, 'default' | 'success' | 'info' | 'warning' | 'gray'> = {
  SITE: 'info', WHATSAPP: 'success', PORTAL: 'default', REFERRAL: 'warning', MANUAL: 'gray',
}

export default async function AdminDashboard() {
  const { stats, recentProperties, recentLeads, leadsChartData, statusChartData } = await getDashboardData()

  const statCards = [
    {
      label: 'Imóveis Ativos',
      value: stats.activeProperties,
      icon: Building2,
      color: 'text-[#2563eb]',
      bg: 'bg-blue-50',
    },
    {
      label: 'Novos Leads (30 dias)',
      value: stats.newLeads,
      icon: Users,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Publicados Este Mês',
      value: stats.publishedThisMonth,
      icon: TrendingUp,
      color: 'text-[#1e3a8a]',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Vendidos / Alugados',
      value: stats.soldRented,
      icon: CheckCircle,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${card.bg}`}>
                <Icon className={card.color} size={24} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Gráficos */}
      <DashboardCharts leadsChartData={leadsChartData} statusChartData={statusChartData} />

      {/* Tabela: Últimos Imóveis Cadastrados */}
      <Card padding={false}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-[#1e3a8a]">Últimos Imóveis Cadastrados</h2>
          <a href="/admin/imoveis" className="text-sm text-[#2563eb] hover:underline">
            Ver todos
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Últimos imóveis cadastrados">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ref</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cidade</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Transação</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentProperties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                    Nenhum imóvel cadastrado ainda.
                  </td>
                </tr>
              ) : (
                recentProperties.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{p.ref}</td>
                    <td className="px-5 py-3 text-gray-700">{p.propertyType ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {p.city ? `${p.city}${p.state ? `, ${p.state}` : ''}` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={propertyStatusBadge[p.status] ?? 'gray'}>
                        {propertyStatusLabel[p.status] ?? p.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {transactionLabel[p.transactionType] ?? p.transactionType}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-[#1e3a8a]">
                      {p.price ? formatCurrency(Number(p.price)) : 'Sob consulta'}
                    </td>
                    <td className="px-5 py-3 text-gray-400">{formatDate(p.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tabela: Últimos Leads Recebidos */}
      <Card padding={false}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-[#1e3a8a]">Últimos Leads Recebidos</h2>
          <a href="/admin/contatos" className="text-sm text-[#2563eb] hover:underline">
            Ver todos
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Últimos leads recebidos">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Imóvel</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Origem</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    Nenhum lead recebido ainda.
                  </td>
                </tr>
              ) : (
                recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-700">{lead.name}</td>
                    <td className="px-5 py-3 text-gray-600">{lead.phone ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                      {lead.property?.ref ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={sourceBadge[lead.source] ?? 'gray'}>
                        {sourceLabel[lead.source] ?? lead.source}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={leadStatusBadge[lead.status] ?? 'gray'}>
                        {leadStatusLabel[lead.status] ?? lead.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{formatDate(lead.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
