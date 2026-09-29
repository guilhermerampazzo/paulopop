'use client'

/**
 * v1.3 — Busca grande da home (e modo compacto na lista /imoveis):
 * campo único "Bairro, quadra, nome do prédio ou código", abas Comprar / Alugar / Empreendimentos,
 * chips de região e botão Buscar → /imoveis?busca=…&transacao=… (ou /empreendimentos?busca=…).
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'comprar' | 'alugar' | 'empreendimentos'

interface Props {
  /** cidades/regiões para os chips (nomes) */
  regions?: string[]
  defaultTab?: Tab
  defaultQuery?: string
  /** modo compacto (lista de imóveis): sem chips grandes, uma linha */
  compact?: boolean
  /** tema escuro (sobre o hero) ou claro */
  tone?: 'dark' | 'light'
  className?: string
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'comprar', label: 'Comprar' },
  { key: 'alugar', label: 'Alugar' },
  { key: 'empreendimentos', label: 'Empreendimentos' },
]

export function HomeSearch({ regions = [], defaultTab = 'comprar', defaultQuery = '', compact = false, tone = 'dark', className }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>(defaultTab)
  const [query, setQuery] = useState(defaultQuery)
  const [aiBusy, setAiBusy] = useState(false)

  function go(q: string, t: Tab = tab) {
    const params = new URLSearchParams()
    const text = q.trim()
    if (t === 'empreendimentos') {
      if (text) params.set('busca', text)
      const qs = params.toString()
      router.push(`/empreendimentos${qs ? `?${qs}` : ''}`)
      return
    }
    if (text) params.set('busca', text)
    params.set('transacao', t)
    router.push(`/imoveis?${params.toString()}`)
  }

  const dark = tone === 'dark'

  return (
    <div className={cn('w-full min-w-0 max-w-full overflow-hidden', className)}>
      <div
        role="tablist"
        aria-label="O que você procura"
        className={cn('inline-flex max-w-full overflow-x-auto rounded-full p-1 [scrollbar-width:none]', dark ? 'border border-white/15 bg-white/10 backdrop-blur-md' : 'border border-slate-200 bg-slate-100')}
      >
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all',
              tab === t.key
                ? (dark ? 'bg-white text-[#1e3a8a] shadow-sm' : 'bg-[#1e3a8a] text-white shadow-sm')
                : (dark ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-[#1e3a8a]'),
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form
        role="search"
        aria-label="Buscar imóveis"
        onSubmit={e => { e.preventDefault(); go(query) }}
        className={cn(
          'mt-3 flex flex-col sm:flex-row gap-2 rounded-2xl',
          compact ? '' : (dark ? 'p-2 bg-white/95 shadow-[0_28px_80px_-42px_rgba(8,30,63,0.9)] backdrop-blur-xl' : 'p-2 bg-white border border-slate-200 shadow-sm'),
        )}
      >
        <label className="group flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors focus-within:border-[#2563eb] focus-within:ring-2 focus-within:ring-[#2563eb]/15 min-w-0">
          <Search className="h-5 w-5 flex-shrink-0 text-slate-400 group-focus-within:text-[#2563eb]" />
          <span className="sr-only">Bairro, quadra, nome do prédio ou código</span>
          <input
            type="search"
            name="busca"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tab === 'empreendimentos' ? 'Nome do prédio, bairro ou construtora' : 'Bairro, quadra, nome do prédio ou código'}
            autoComplete="off"
            enterKeyHint="search"
            className="w-full min-w-0 bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] px-6 py-3 text-sm font-semibold text-white transition"
        >
          <Search className="h-4 w-4" />
          Buscar
        </button>
        {tab !== 'empreendimentos' && (
          <button
            type="button"
            onClick={async () => {
              if (!query.trim()) return
              setAiBusy(true)
              try {
                const res = await fetch('/api/busca-ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: query }) })
                const d = await res.json().catch(() => null)
                if (res.ok && d?.url) router.push(d.url); else go(query)
              } catch { go(query) } finally { setAiBusy(false) }
            }}
            disabled={aiBusy}
            title="Descreva o que procura em palavras: 'apartamento 2 quartos até 320 mil perto do metrô em Samambaia'"
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#2563eb] px-4 py-3 text-sm font-semibold text-[#2563eb] hover:bg-[#eff6ff] disabled:opacity-60"
          >
            {aiBusy ? '…' : '✨ Buscar com IA'}
          </button>
        )}
      </form>

      {regions.length > 0 && (
        <div className={cn('mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]', compact ? 'text-xs' : 'text-sm')} aria-label="Regiões">
          {regions.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => go(r)}
              className={cn(
                'inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 font-medium transition-colors',
                dark ? 'border-white/20 bg-white/10 text-white hover:bg-white hover:text-[#1e3a8a]' : 'border-slate-200 bg-white text-slate-600 hover:border-[#1e3a8a] hover:text-[#1e3a8a]',
              )}
            >
              <MapPin className="h-3.5 w-3.5" /> {r}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
