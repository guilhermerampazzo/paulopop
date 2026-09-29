/**
 * v1.3 — Faixa de parceiros publicados (server component) para a página do imóvel e do empreendimento.
 * Uso: <PartnersStrip types={['BANCO', 'CARTORIO']} title="Parceiros para o seu financiamento" limit={6} />
 */
import Link from 'next/link'
import { Handshake } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { partnerTypeLabel } from '@/lib/partners'

interface Props { types?: string[]; title?: string; limit?: number }

export async function PartnersStrip({ types, title = 'Parceiros indicados pelo Paulo Pop', limit = 8 }: Props) {
  const partners = await prisma.partner.findMany({
    where: { status: 'PUBLISHED', ...(types?.length ? { type: { in: types } } : {}) },
    orderBy: [{ featured: 'desc' }, { order: 'asc' }, { name: 'asc' }],
    take: Math.min(24, Math.max(1, limit)),
    select: { id: true, slug: true, name: true, type: true, tagline: true, logoUrl: true, benefit: true },
  }).catch(() => [])
  if (!partners.length) return null

  return (
    <section aria-label={title} className="min-w-0">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <p className="text-[#ea580c] uppercase tracking-wide text-xs font-semibold">Parceiros</p>
          <h2 className="font-display text-xl md:text-2xl font-bold text-[#1e3a8a]">{title}</h2>
        </div>
        <Link href="/parceiros" className="text-sm font-semibold text-[#2563eb] hover:underline whitespace-nowrap">Ver todos</Link>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-2 snap-x [scrollbar-width:thin]">
        {partners.map(p => (
          <li key={p.id} className="w-56 flex-shrink-0 snap-start">
            <Link href={`/parceiros/${p.slug}`} className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 flex items-center">
                {p.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logoUrl} alt={p.name} loading="lazy" className="max-h-12 max-w-[140px] object-contain" />
                ) : <Handshake className="w-8 h-8 text-[#93c5fd]" />}
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-wide text-gray-500">{partnerTypeLabel(p.type)}</p>
              <h3 className="font-semibold text-[#1e3a8a] break-words">{p.name}</h3>
              {(p.benefit || p.tagline) && <p className="mt-1 text-xs text-gray-600 line-clamp-2">{p.benefit || p.tagline}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
