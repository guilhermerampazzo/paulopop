'use client'

import { useState } from 'react'
import { Footprints, Star } from 'lucide-react'
import type { AreaCategory } from '@/lib/area-insight-shared'

/** v1.3 — abas do bloco "Viver aqui" (Transporte, Comércio, Escolas, Saúde, Lazer). */
export function AreaInsightTabs({ tabs }: { tabs: Array<{ tab: string; categories: AreaCategory[] }> }) {
  const [active, setActive] = useState(0)
  const cur = tabs[active] ?? tabs[0]
  return (
    <div>
      <div role="tablist" aria-label="Categorias da região" className="flex flex-wrap gap-2">
        {tabs.map((t, i) => (
          <button key={t.tab} role="tab" aria-selected={i === active} type="button" onClick={() => setActive(i)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${i === active ? 'bg-[#1e3a8a] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {t.tab}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-3 grid gap-4 md:grid-cols-2">
        {cur?.categories.map(c => (
          <div key={c.key}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{c.label}</p>
            <ul className="mt-1 divide-y divide-gray-100">
              {c.places.slice(0, 6).map(p => (
                <li key={p.id} className="flex items-start justify-between gap-2 py-1.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{p.name}
                      {p.schoolKind && <span className={`ml-2 rounded px-1.5 text-[10px] align-middle ${p.schoolKind === 'publica' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{p.schoolKind === 'publica' ? 'pública' : 'particular'}</span>}
                    </p>
                    {p.rating != null && <p className="text-[11px] text-gray-500 flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" /> {p.rating.toLocaleString('pt-BR')} {p.ratings ? `(${p.ratings})` : ''}</p>}
                  </div>
                  <p className="shrink-0 text-right text-xs text-gray-500">
                    {p.distanceM >= 1000 ? `${(p.distanceM / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km` : `${p.distanceM} m`}
                    <span className="block flex items-center justify-end gap-1"><Footprints className="h-3 w-3" /> {p.walkMin} min</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
