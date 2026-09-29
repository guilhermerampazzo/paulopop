'use client'

/**
 * v1.3 — Vitrine unificada da home: recebe até 24 imóveis já carregados no servidor e filtra
 * no cliente com chips (Todos / Apartamentos / Casas / Lançamentos / Preço reduzido).
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PropertyCard, type PropertyCardProps } from './PropertyCard'
import { cn } from '@/lib/utils'

export type ShowcaseItem = Omit<PropertyCardProps, 'className'>

type Chip = 'todos' | 'apartamentos' | 'casas' | 'lancamentos' | 'reduzido'

const CHIPS: Array<{ key: Chip; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'apartamentos', label: 'Apartamentos' },
  { key: 'casas', label: 'Casas' },
  { key: 'lancamentos', label: 'Lançamentos' },
  { key: 'reduzido', label: 'Preço reduzido' },
]

const APT_RE = /apartamento|studio|flat|cobertura|kitnet|loft/i
const HOUSE_RE = /casa|sobrado|mans[aã]o|ch[aá]cara|s[ií]tio/i

export function matchesChip(p: ShowcaseItem, chip: Chip): boolean {
  switch (chip) {
    case 'apartamentos': return APT_RE.test(p.propertyType ?? '')
    case 'casas': return HOUSE_RE.test(p.propertyType ?? '')
    case 'lancamentos': return !!p.isLaunch
    case 'reduzido': return !!p.priceReduced
    default: return true
  }
}

interface Props { items: ShowcaseItem[]; whatsapp?: string | null; limit?: number; /** chips desligados no painel (showApartamentos/showCasas) */ hideChips?: Chip[] }

export function HomeShowcase({ items, whatsapp, limit = 12, hideChips = [] }: Props) {
  const [chip, setChip] = useState<Chip>('todos')
  const counts = useMemo(() => Object.fromEntries(CHIPS.map(c => [c.key, items.filter(p => matchesChip(p, c.key)).length])) as Record<Chip, number>, [items])
  const visible = useMemo(() => items.filter(p => matchesChip(p, chip)).slice(0, limit), [items, chip, limit])

  const hrefFor: Record<Chip, string> = {
    todos: '/imoveis',
    apartamentos: '/imoveis?tipo=Apartamento',
    casas: '/imoveis?tipo=Casa',
    lancamentos: '/empreendimentos',
    reduzido: '/imoveis?ordem=menor-preco',
  }

  return (
    <div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist" aria-label="Filtro rápido">
        {CHIPS.filter(c => c.key === 'todos' || (counts[c.key] > 0 && !hideChips.includes(c.key))).map(c => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={chip === c.key}
            onClick={() => setChip(c.key)}
            className={cn(
              'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
              chip === c.key ? 'bg-[#1e3a8a] border-[#1e3a8a] text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-[#1e3a8a] hover:text-[#1e3a8a]',
            )}
          >
            {c.label}
            <span className={cn('text-xs', chip === c.key ? 'text-white/70' : 'text-slate-400')}>{counts[c.key]}</span>
          </button>
        ))}
      </div>

      {visible.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visible.map((p, i) => (
            <PropertyCard key={p.id} {...p} whatsapp={whatsapp} priority={i < 4} />
          ))}
        </div>
      ) : (
        <div className="rounded-[30px] border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-display text-2xl font-bold text-[#1e3a8a]">Nenhum imóvel nessa categoria</p>
          <p className="mt-2 text-sm text-slate-500">Assim que novos imóveis entrarem, eles aparecem aqui.</p>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href={hrefFor[chip]} className="inline-flex items-center gap-2 rounded-full border border-[#1e3a8a]/15 bg-white px-6 py-3 text-sm font-semibold text-[#1e3a8a] transition hover:border-[#2563eb] hover:text-[#2563eb]">
          Ver todos os imóveis <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
