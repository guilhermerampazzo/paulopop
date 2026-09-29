export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/empreendimento-units'
import { formatCurrency } from '@/lib/formatters'
import { Building2, MapPin, Layers, DollarSign, Calendar, BedDouble, Maximize2, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Empreendimentos em Samambaia e região',
  alternates: { canonical: '/empreendimentos' },
  description: 'Conheça os lançamentos e projetos imobiliários disponíveis.',
}

export default async function EmpreendimentosPage({ searchParams }: { searchParams?: { busca?: string } }) {
  // v1.3: busca por nome, bairro ou cidade (campo único da home)
  const busca = (searchParams?.busca ?? '').trim().slice(0, 120)
  const rows = await prisma.empreendimento.findMany({
    where: {
      status: 'PUBLISHED',
      ...(busca ? { OR: [
        { name: { contains: busca, mode: 'insensitive' } },
        { neighborhood: { contains: busca, mode: 'insensitive' } },
        { city: { contains: busca, mode: 'insensitive' } },
        { builder: { contains: busca, mode: 'insensitive' } },
      ] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      images: { where: { category: 'FACHADA' }, take: 1, orderBy: { order: 'asc' } },
      _count: { select: { properties: { where: { status: 'ACTIVE', hideOnSite: false } } } },
    },
  })
  // v1.2: lançamentos e obras primeiro; entregues depois (ordem de entrega mais recente)
  const empreendimentos = [...rows].sort((a, b) => (STAGE_ORDER[a.stage] ?? 9) - (STAGE_ORDER[b.stage] ?? 9) || (b.deliveryYear ?? 0) - (a.deliveryYear ?? 0))

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <div className="bg-[#1e3a8a] py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-[#93c5fd] text-xs font-semibold uppercase tracking-widest mb-2">Prédios que eu conheço de perto</p>
          <h1 className="font-display text-4xl font-bold text-white">Empreendimentos</h1>
          <p className="text-white/60 mt-2">Lançamentos, obras e prédios prontos em Samambaia, Águas Claras e região: unidades à venda, negociadas e a história de cada condomínio.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {busca && (
          <p className="mb-6 text-sm text-gray-600">Resultados para <strong className="text-[#1e3a8a]">&ldquo;{busca}&rdquo;</strong> · <Link href="/empreendimentos" className="text-[#2563eb] hover:underline">limpar busca</Link></p>
        )}
        {empreendimentos.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{busca ? 'Nenhum empreendimento encontrado para essa busca.' : 'Nenhum empreendimento disponível no momento.'}</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {empreendimentos.map(emp => {
              const cover = emp.coverUrl ?? emp.images[0]?.url
              return (
                <Link key={emp.id} href={`/empreendimentos/${emp.slug}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow group">
                  <div className="relative h-56 bg-gray-100 overflow-hidden">
                    {cover ? (
                      <Image src={cover} alt={emp.name} fill sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1e3a8a] to-[#2563eb]">
                        <Building2 className="w-12 h-12 text-white/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full ${emp.stage === 'LANCAMENTO' ? 'bg-[#ea580c] text-white' : emp.stage === 'EM_OBRAS' ? 'bg-amber-400 text-amber-950' : 'bg-white/90 text-[#1e3a8a]'}`}>
                      {STAGE_LABEL[emp.stage] ?? emp.stage}{emp._count.properties > 0 ? ` · ${emp._count.properties} à venda` : ''}
                    </div>
                    {emp.financing && (
                      <div className="absolute top-3 left-3 bg-[#2563eb] text-white text-xs font-semibold px-3 py-1 rounded-full">
                        {emp.financing}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    {emp.neighborhood && (
                      <div className="flex items-center gap-1 text-[#2563eb] text-xs font-semibold mb-1">
                        <MapPin className="w-3 h-3" />{emp.neighborhood}{emp.city ? `, ${emp.city}` : ''}
                      </div>
                    )}
                    <h2 className="font-display text-xl font-bold text-[#1e3a8a] group-hover:text-[#2563eb] transition-colors mb-1">{emp.name}</h2>
                    {emp.tagline && <p className="text-sm text-gray-500 line-clamp-2 mb-4">{emp.tagline}</p>}
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
                      {(emp.bedroomsMin ?? emp.bedroomsMax) && (
                        <span className="flex items-center gap-1">
                          <BedDouble className="w-4 h-4 text-[#2563eb]" />
                          {emp.bedroomsMin === emp.bedroomsMax ? `${emp.bedroomsMin} qtos` : `${emp.bedroomsMin ?? '?'}–${emp.bedroomsMax ?? '?'} qtos`}
                        </span>
                      )}
                      {(emp.areaMin ?? emp.areaMax) && (
                        <span className="flex items-center gap-1">
                          <Maximize2 className="w-4 h-4 text-[#2563eb]" />
                          {emp.areaMin === emp.areaMax ? `${emp.areaMin}m²` : `${emp.areaMin ?? '?'}–${emp.areaMax ?? '?'}m²`}
                        </span>
                      )}
                      {emp.totalUnits && (
                        <span className="flex items-center gap-1">
                          <Layers className="w-4 h-4 text-[#2563eb]" />{emp.totalUnits} unidades
                        </span>
                      )}
                      {(emp.deliveryYear || emp.deliveryDate) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-[#2563eb]" />{emp.stage === 'ENTREGUE' ? 'Entregue em ' : 'Entrega: '}{emp.deliveryYear ?? emp.deliveryDate}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      {emp.priceMin ? (
                        <span className="text-[#1e3a8a] font-bold text-sm flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-[#2563eb]" />
                          A partir de {formatCurrency(Number(emp.priceMin))}
                        </span>
                      ) : <span />}
                      <span className="flex items-center gap-1 text-[#2563eb] text-sm font-semibold">
                        Ver mais <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
