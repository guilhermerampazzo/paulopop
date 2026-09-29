export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { BarChart3, ExternalLink, FileText, Search } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getSessionUser, propertyScope } from '@/lib/authz'
import { formatDuration } from '@/lib/sales'

// v1.1: resumo de vendas e locações (ticket médio, desconto médio e tempo médio) por região
async function loadSales(scope: Record<string, unknown>) {
  const rows = await prisma.property.findMany({
    where: { ...scope, status: { in: ['SOLD', 'RENTED'] } },
    orderBy: [{ soldAt: 'desc' }],
    select: { id: true, ref: true, title: true, status: true, city: true, neighborhood: true, soldAt: true, listPriceAtSale: true, salePrice: true, saleDiscountPct: true, daysOnMarket: true, saleSource: true },
  })
  const num = (v: unknown) => (v == null ? null : Number(v))
  const items = rows.map(r => ({ ...r, listPriceAtSale: num(r.listPriceAtSale), salePrice: num(r.salePrice), saleDiscountPct: num(r.saleDiscountPct) }))
  const avg = (arr: Array<number | null>) => { const v = arr.filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }
  const summary = {
    total: items.length,
    sold: items.filter(i => i.status === 'SOLD').length,
    rented: items.filter(i => i.status === 'RENTED').length,
    avgTicket: avg(items.filter(i => i.status === 'SOLD').map(i => i.salePrice)),
    avgDiscount: avg(items.map(i => i.saleDiscountPct)),
    avgDays: avg(items.map(i => i.daysOnMarket)),
  }
  const byCity = Object.values(items.reduce<Record<string, { city: string; n: number; days: Array<number | null>; disc: Array<number | null> }>>((acc, i) => {
    const c = (i.city ?? 'Sem cidade').replace(/\s*-\s*DF$/i, '')
    acc[c] ??= { city: c, n: 0, days: [], disc: [] }
    acc[c].n++; acc[c].days.push(i.daysOnMarket); acc[c].disc.push(i.saleDiscountPct)
    return acc
  }, {})).map(c => ({ city: c.city, n: c.n, avgDays: avg(c.days), avgDiscount: avg(c.disc) })).sort((a, b) => b.n - a.n)
  return { items: items.slice(0, 20), summary, byCity }
}

const brl = (v: number | null) => v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
const pct = (v: number | null) => v == null ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

export default async function AdminRelatoriosPage() {
  const user = await getSessionUser()
  const scope = user ? propertyScope(user) : { id: '__none__' }
  const sales = await loadSales(scope)
  const properties = await prisma.property.findMany({
    where: scope,
    orderBy: { updatedAt: 'desc' },
    take: 30,
    select: {
      id: true,
      ref: true,
      title: true,
      propertyType: true,
      city: true,
      state: true,
      marketAnalyses: {
        orderBy: { generatedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          generatedAt: true,
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      {/* v1.1: Vendas e locações */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-[#1e3a8a]">Vendas e locações concluídas</h2>
        <p className="text-sm text-gray-500">Registradas pelo botão “Vendido/Alugado” na ficha do imóvel. Use estes números na captação.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: 'Concluídos', value: String(sales.summary.total) },
            { label: 'Vendidos / alugados', value: `${sales.summary.sold} / ${sales.summary.rented}` },
            { label: 'Ticket médio (venda)', value: brl(sales.summary.avgTicket) },
            { label: 'Desconto médio', value: pct(sales.summary.avgDiscount) },
            { label: 'Tempo médio', value: sales.summary.avgDays == null ? '—' : formatDuration(Math.round(sales.summary.avgDays)) },
          ].map(k => (
            <div key={k.label} className="rounded-xl bg-[#F0F4F8] p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">{k.label}</p>
              <p className="mt-1 text-lg font-bold text-[#1e3a8a]">{k.value}</p>
            </div>
          ))}
        </div>
        {sales.byCity.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-gray-500"><th className="py-2 pr-4">Cidade</th><th className="py-2 pr-4">Concluídos</th><th className="py-2 pr-4">Tempo médio</th><th className="py-2 pr-4">Desconto médio</th></tr></thead>
              <tbody>
                {sales.byCity.map(c => (
                  <tr key={c.city} className="border-t border-gray-100">
                    <td className="py-2 pr-4 font-medium text-gray-800">{c.city}</td>
                    <td className="py-2 pr-4">{c.n}</td>
                    <td className="py-2 pr-4">{c.avgDays == null ? '—' : formatDuration(Math.round(c.avgDays))}</td>
                    <td className="py-2 pr-4">{pct(c.avgDiscount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sales.items.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-gray-500"><th className="py-2 pr-4">Imóvel</th><th className="py-2 pr-4">Data</th><th className="py-2 pr-4">Anunciado</th><th className="py-2 pr-4">Final</th><th className="py-2 pr-4">Desconto</th><th className="py-2 pr-4">Tempo</th><th className="py-2 pr-4">Origem</th></tr></thead>
              <tbody>
                {sales.items.map(i => (
                  <tr key={i.id} className="border-t border-gray-100">
                    <td className="py-2 pr-4"><Link href={`/admin/imoveis/${i.id}`} className="font-medium text-[#2563eb] hover:underline">{i.ref}</Link> <span className="text-gray-500">{i.title ?? ''}</span></td>
                    <td className="py-2 pr-4">{i.soldAt ? new Date(i.soldAt).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="py-2 pr-4">{brl(i.listPriceAtSale)}</td>
                    <td className="py-2 pr-4">{brl(i.salePrice)}</td>
                    <td className="py-2 pr-4">{pct(i.saleDiscountPct)}</td>
                    <td className="py-2 pr-4">{i.daysOnMarket == null ? '—' : formatDuration(i.daysOnMarket)}</td>
                    <td className="py-2 pr-4">{i.saleSource ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sales.items.length === 0 && <p className="mt-4 text-sm text-gray-400">Nenhuma venda ou locação registrada ainda.</p>}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0F4F8]">
            <FileText className="h-5 w-5 text-[#2563eb]" />
          </div>
          <div>
            <h2 className="font-semibold text-[#1e3a8a]">Relatórios de análise</h2>
            <p className="text-sm text-gray-500">
              Acesse os relatórios públicos dos imóveis e a análise de mercado do painel.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-5 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-[#1e3a8a]">Imóveis com acesso a relatórios</h3>
            <p className="text-sm text-gray-500">Abra o relatório público ou continue pela análise de mercado.</p>
          </div>
          <span className="text-sm font-medium text-[#2563eb]">{properties.length} imoveis</span>
        </div>

        {properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <Search className="h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-600">Nenhum imovel cadastrado ainda.</p>
            <p className="max-w-md text-sm text-gray-400">
              Quando houver imóveis no sistema, eles aparecerão aqui para consulta de relatórios e análises.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {properties.map(property => {
              const latestAnalysis = property.marketAnalyses[0]

              return (
                <div key={property.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-mono text-gray-400">{property.ref}</p>
                    <h4 className="mt-1 font-medium text-[#1e3a8a]">
                      {property.title ?? property.propertyType ?? 'Imovel sem titulo'}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      {property.propertyType ?? 'Tipo nao informado'}
                      {property.city ? ` • ${property.city}` : ''}
                      {property.state ? `, ${property.state}` : ''}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      {latestAnalysis
                        ? `Ultima analise em ${latestAnalysis.generatedAt.toLocaleDateString('pt-BR')}`
                        : 'Nenhuma analise gerada ainda'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/relatorio/${property.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2563eb] px-4 py-2 text-sm font-medium text-[#2563eb] transition hover:bg-[#2563eb] hover:text-white"
                      aria-label={`Abrir relatório de ${property.title ?? property.ref}`}
                    >
                      <ExternalLink size={14} />
                      Abrir relatório
                    </Link>
                    <Link
                      href={`/admin/estudos?propertyId=${property.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                      aria-label={`Criar estudo de mercado de ${property.title ?? property.ref}`}
                    >
                      <BarChart3 size={14} />
                      Estudo de mercado
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
