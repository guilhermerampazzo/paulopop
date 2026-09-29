'use client'

/**
 * v1.3 — Características agrupadas (Imóvel / Condomínio / Segurança / Lazer) com "ver mais".
 */
import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Home, Building2, ShieldCheck, Waves } from 'lucide-react'
import type { FeatureGroup } from '@/lib/property-features'

const ICONS: Record<string, React.ReactNode> = {
  'Imóvel': <Home className="w-4 h-4" />,
  'Condomínio': <Building2 className="w-4 h-4" />,
  'Segurança': <ShieldCheck className="w-4 h-4" />,
  'Lazer': <Waves className="w-4 h-4" />,
}

const PREVIEW = 6

export function FeatureGroups({ groups }: { groups: FeatureGroup[] }) {
  const [expanded, setExpanded] = useState(false)
  if (!groups.length) return null
  const total = groups.reduce((a, g) => a + g.items.length, 0)
  const isLong = total > PREVIEW * 2

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm" aria-labelledby="caracteristicas-title">
      <h2 id="caracteristicas-title" className="font-semibold text-[#1e3a8a] mb-4">Características</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        {groups.map(g => {
          const items = expanded || !isLong ? g.items : g.items.slice(0, PREVIEW)
          return (
            <div key={g.name} className="min-w-0">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#2563eb] mb-2">{ICONS[g.name]} {g.name}</h3>
              <ul className="space-y-1.5">
                {items.map(label => (
                  <li key={label} className="flex items-start gap-2 text-sm text-gray-700 break-words">
                    <Check className="w-4 h-4 mt-0.5 text-[#1e3a8a] flex-shrink-0" /> {label}
                  </li>
                ))}
                {!expanded && isLong && g.items.length > PREVIEW && (
                  <li className="text-xs text-gray-400">+{g.items.length - PREVIEW} itens</li>
                )}
              </ul>
            </div>
          )
        })}
      </div>
      {isLong && (
        <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#2563eb] hover:text-[#1e3a8a]">
          {expanded ? <>Ver menos <ChevronUp className="w-4 h-4" /></> : <>Ver todas as {total} características <ChevronDown className="w-4 h-4" /></>}
        </button>
      )}
    </section>
  )
}
