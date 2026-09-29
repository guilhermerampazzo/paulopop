import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PropertyCarousel } from '@/components/public/PropertyCarousel'
import { formatDuration } from '@/lib/sales'
import { STAGE_LABEL } from '@/lib/empreendimento-units'
import { Building2, TrendingUp, BadgeCheck, Bell, Home } from 'lucide-react'
import type { Prisma } from '@prisma/client'

/**
 * v1.2 — "página do prédio": unidades disponíveis (anúncios ativos ligados ao empreendimento),
 * vendidos/alugados, números do prédio e matriz de unidades por bloco.
 */

const CARD_SELECT: Prisma.PropertySelect = {
  id: true, slug: true, title: true, propertyType: true, transactionType: true, status: true,
  price: true, totalArea: true, usefulArea: true, suites: true, balconies: true, bedrooms: true, bathrooms: true,
  environments: true, totalParkingSpots: true, neighborhood: true, city: true, state: true, zipCode: true, createdAt: true,
  daysOnMarket: true, salePrice: true, showSalePrice: true, unitId: true,
  images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 1, select: { url: true, thumbnailUrl: true } },
}

type Row = {
  id: string; slug: string; title: string | null; propertyType: string | null; transactionType: string; status: string
  price: unknown; totalArea: unknown; usefulArea: unknown; suites: number | null; balconies: number | null; bedrooms: number | null
  bathrooms: number | null; environments: number | null; totalParkingSpots: number | null; neighborhood: string | null; city: string | null
  state: string | null; zipCode: string | null; createdAt: Date; daysOnMarket: number | null; salePrice: unknown; showSalePrice: boolean; unitId: string | null
  images: Array<{ url: string; thumbnailUrl: string | null }>
}

function toCard(p: Row) {
  return {
    ...p,
    price: p.price ? Number(p.price) : null,
    totalArea: p.totalArea ? Number(p.totalArea) : null,
    usefulArea: p.usefulArea ? Number(p.usefulArea) : null,
    salePrice: p.salePrice ? Number(p.salePrice) : null,
    coverImage: p.images[0]?.thumbnailUrl ?? p.images[0]?.url ?? null,
    isNew: false,
  }
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export async function EmpreendimentoHub({ empreendimentoId, empName, stage, whatsapp }: { empreendimentoId: string; empName: string; stage: string; whatsapp: string }) {
  const [available, sold, blocks, units] = await Promise.all([
    prisma.property.findMany({ where: { empreendimentoId, status: 'ACTIVE', hideOnSite: false }, orderBy: { createdAt: 'desc' }, take: 24, select: CARD_SELECT }),
    prisma.property.findMany({ where: { empreendimentoId, status: { in: ['SOLD', 'RENTED'] }, hideOnSite: false }, orderBy: [{ soldAt: 'desc' }], take: 12, select: CARD_SELECT }),
    prisma.empreendimentoBlock.findMany({ where: { empreendimentoId }, orderBy: { order: 'asc' } }),
    prisma.empreendimentoUnit.findMany({ where: { empreendimentoId }, orderBy: [{ floor: 'asc' }, { number: 'asc' }], select: { id: true, blockId: true, floor: true, number: true, unitType: { select: { name: true } } } }),
  ])

  const forSale = available.filter(p => p.transactionType === 'SALE')
  const forRent = available.filter(p => p.transactionType === 'RENT')
  const pricesM2 = forSale.map(p => (p.price && (p.usefulArea ?? p.totalArea)) ? Number(p.price) / Number(p.usefulArea ?? p.totalArea) : null).filter((v): v is number => !!v && Number.isFinite(v))
  const avgM2 = pricesM2.length ? pricesM2.reduce((a, b) => a + b, 0) / pricesM2.length : null
  const days = sold.map(p => p.daysOnMarket).filter((v): v is number => v != null)
  const avgDays = days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null

  const unitStatus = new Map<string, string>()
  for (const p of [...available, ...sold]) if (p.unitId && !unitStatus.has(p.unitId)) unitStatus.set(p.unitId, p.status)
  const unitLink = new Map<string, string>()
  for (const p of available) if (p.unitId) unitLink.set(p.unitId, `/imoveis/${p.slug}`)

  const waDigits = whatsapp.replace(/\D/g, '')
  const waAlert = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Olá! Quero ser avisado quando surgir um apartamento no ${empName}.`)}` : '/contato'
  const waOwner = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Olá! Tenho um apartamento no ${empName} e quero uma avaliação gratuita.`)}` : '/contato'

  const nothing = available.length === 0 && sold.length === 0 && units.length === 0

  return (
    <div className="space-y-10">
      {/* Números do prédio */}
      <section aria-labelledby="hub-numeros">
        <h2 id="hub-numeros" className="font-display text-xl font-bold text-[#1e3a8a] mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#2563eb]" /> Este prédio em números</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Estágio', value: STAGE_LABEL[stage] ?? stage },
            { label: 'À venda agora', value: String(forSale.length) },
            { label: 'Para alugar agora', value: String(forRent.length) },
            { label: avgM2 ? 'Preço médio do m² (anúncios)' : 'Vendidos por aqui', value: avgM2 ? `${brl(avgM2)}/m²` : String(sold.length) },
          ].map(k => (
            <div key={k.label} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">{k.label}</p>
              <p className="mt-1 text-lg font-bold text-[#1e3a8a]">{k.value}</p>
            </div>
          ))}
        </div>
        {(sold.length > 0 || avgDays != null) && (
          <p className="mt-3 text-sm text-gray-600 flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-green-600" />
            {sold.length} {sold.length === 1 ? 'unidade negociada' : 'unidades negociadas'} por Paulo Pop neste prédio{avgDays != null ? ` · tempo médio de ${formatDuration(avgDays)}` : ''}.
          </p>
        )}
      </section>

      {/* Unidades disponíveis */}
      <section aria-labelledby="hub-disponiveis">
        <h2 id="hub-disponiveis" className="font-display text-xl font-bold text-[#1e3a8a] mb-4 flex items-center gap-2"><Home className="w-5 h-5 text-[#2563eb]" /> Unidades disponíveis</h2>
        {available.length > 0 ? (
          <PropertyCarousel properties={available.map(p => toCard(p as unknown as Row))} />
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-gray-600">
            Nenhuma unidade anunciada neste momento.{' '}
            <a href={waAlert} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2563eb] hover:underline">Quero ser avisado quando surgir.</a>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={waAlert} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#1e3a8a] px-4 py-2 text-sm font-semibold text-[#1e3a8a] hover:bg-[#eff6ff]">
            <Bell className="w-4 h-4" /> Avise-me quando surgir unidade
          </a>
          <a href={waOwner} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#ea580c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c2410c]">
            <Building2 className="w-4 h-4" /> Tem apartamento neste prédio? Avalie grátis
          </a>
        </div>
      </section>

      {/* Vendidos */}
      {sold.length > 0 && (
        <section aria-labelledby="hub-vendidos">
          <h2 id="hub-vendidos" className="font-display text-xl font-bold text-[#1e3a8a] mb-4 flex items-center gap-2"><BadgeCheck className="w-5 h-5 text-[#2563eb]" /> Negociados neste prédio</h2>
          <PropertyCarousel properties={sold.map(p => toCard(p as unknown as Row))} />
        </section>
      )}

      {/* Matriz de unidades */}
      {units.length > 0 && (
        <section aria-labelledby="hub-matriz">
          <h2 id="hub-matriz" className="font-display text-xl font-bold text-[#1e3a8a] mb-2">Mapa de unidades</h2>
          <p className="text-xs text-gray-500 mb-4">Verde: à venda ou para alugar (clique para abrir) · Vermelho: vendido · Laranja: alugado · Cinza: sem anúncio no momento.</p>
          <div className="space-y-6 rounded-2xl bg-white p-4 shadow-sm overflow-x-auto">
            {blocks.map(b => {
              const bu = units.filter(u => u.blockId === b.id)
              const floors = Array.from(new Set(bu.map(u => u.floor))).sort((a, c) => c - a)
              return (
                <div key={b.id}>
                  {blocks.length > 1 && <p className="mb-2 text-sm font-semibold text-gray-700">{b.name}</p>}
                  <table className="text-xs">
                    <tbody>
                      {floors.map(f => (
                        <tr key={f}>
                          <td className="pr-2 py-0.5 whitespace-nowrap text-gray-400">{f === 0 ? 'Térreo' : `${f}º`}</td>
                          {bu.filter(u => u.floor === f).map(u => {
                            const st = unitStatus.get(u.id)
                            const cls = st === 'ACTIVE' ? 'bg-green-500 text-white' : st === 'SOLD' ? 'bg-red-500 text-white' : st === 'RENTED' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                            const href = unitLink.get(u.id)
                            const title = `${u.number}${u.unitType ? ` · ${u.unitType.name}` : ''}`
                            return (
                              <td key={u.id} className="p-0.5">
                                {href ? <Link href={href} title={title} className={`block min-w-[40px] rounded px-1.5 py-1 text-center font-medium ${cls}`}>{u.number}</Link>
                                      : <span title={title} className={`block min-w-[40px] rounded px-1.5 py-1 text-center ${cls}`}>{u.number}</span>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {nothing && null}
    </div>
  )
}
