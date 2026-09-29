'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const PROPERTY_TYPES = [
  'Apartamento', 'Casa', 'Sobrado', 'Terreno', 'Sala Comercial',
  'Loja', 'Galpão', 'Prédio', 'Chácara', 'Fazenda',
  'Studio', 'Kitnet', 'Cobertura', 'Flat', 'Mansão',
]

const FEATURES = [
  { value: 'POOL', label: 'Piscina' },
  { value: 'GARAGE', label: 'Garagem' },
  { value: 'GYM', label: 'Academia' },
  { value: 'ELEVATOR', label: 'Elevador' },
  { value: 'FURNISHED', label: 'Mobiliado' },
  { value: 'AIR_CONDITIONING', label: 'Ar condicionado' },
  { value: 'BARBECUE', label: 'Churrasqueira' },
  { value: 'ACCEPTS_PETS', label: 'Aceita Pets' },
  { value: 'SECURITY_24H', label: 'Segurança 24h' },
  { value: 'GOURMET_BALCONY', label: 'Varanda Gourmet' },
]


function CountButton({ value, current, onClick }: { value: string; current: string; onClick: (v: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(current === value ? '' : value)}
      className={cn(
        'w-10 h-10 rounded-lg border text-sm font-medium transition-colors',
        current === value
          ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
          : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e3a8a] hover:text-[#1e3a8a]'
      )}
      aria-pressed={current === value}
    >
      {value === '4' ? '4+' : value}
    </button>
  )
}

export interface FilterLocation { city: string; neighborhoods: string[] }

interface PropertyFiltersProps {
  className?: string
  locations?: FilterLocation[]
}

export function PropertyFilters({ className, locations = [] }: PropertyFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const [mobileOpen, setMobileOpen] = useState(false)

  // Ler valores dos params
  const transacao = params.get('transacao') ?? 'comprar'
  const finalidade = params.get('finalidade') ?? ''
  const tipo = params.get('tipo') ?? ''
  const precoMin = params.get('precoMin') ?? ''
  const precoMax = params.get('precoMax') ?? ''
  const quartos = params.get('quartos') ?? ''
  const banheiros = params.get('banheiros') ?? ''
  const areaMin = params.get('areaMin') ?? ''
  const estado = params.get('estado') ?? ''
  const bairro = params.get('bairro') ?? ''
  const cidade = params.get('cidade') ?? ''
  const features = params.getAll('feature')
  // v1.3: `busca` é o campo único novo; `q` continua aceito
  const q = params.get('q') ?? ''
  const busca = params.get('busca') ?? ''

  const setParam = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    next.delete('pagina') // reset pagination
    router.push(`${pathname}?${next.toString()}`)
  }, [params, pathname, router])

  const toggleFeature = useCallback((f: string) => {
    const next = new URLSearchParams(params.toString())
    const existing = next.getAll('feature')
    next.delete('feature')
    if (existing.includes(f)) {
      existing.filter(x => x !== f).forEach(x => next.append('feature', x))
    } else {
      [...existing, f].forEach(x => next.append('feature', x))
    }
    next.delete('pagina')
    router.push(`${pathname}?${next.toString()}`)
  }, [params, pathname, router])

  const clearAll = useCallback(() => {
    const next = new URLSearchParams()
    if (q) next.set('q', q)
    if (busca) next.set('busca', busca)
    router.push(`${pathname}?${next.toString()}`)
  }, [q, busca, pathname, router])

  const hasFilters = transacao !== 'comprar' || !!finalidade || !!tipo || !!precoMin || !!precoMax ||
    !!quartos || !!banheiros || !!areaMin || !!estado || !!bairro || features.length > 0

  const filterContent = (
    <div className={cn('space-y-6', className)}>
      {/* Limpar filtros */}
      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1 text-sm text-[#2563eb] hover:text-[#1e3a8a] transition-colors"
        >
          <X className="w-4 h-4" />
          Limpar filtros
        </button>
      )}

      {/* Tipo de Transação */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Transação</p>
        <div className="flex gap-2">
          {(['comprar', 'alugar'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setParam('transacao', t)}
              className={cn(
                'flex-1 py-2 text-sm rounded-lg border font-medium transition-colors',
                transacao === t
                  ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e3a8a]'
              )}
              aria-pressed={transacao === t}
            >
              {t === 'comprar' ? 'Comprar' : 'Alugar'}
            </button>
          ))}
        </div>
      </div>

      {/* Finalidade */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Finalidade</p>
        <div className="flex gap-2">
          {[{ v: '', l: 'Todos' }, { v: 'residencial', l: 'Residencial' }, { v: 'comercial', l: 'Comercial' }].map(f => (
            <button
              key={f.v}
              type="button"
              onClick={() => setParam('finalidade', f.v)}
              className={cn(
                'flex-1 py-2 text-xs rounded-lg border font-medium transition-colors',
                finalidade === f.v
                  ? 'bg-[#2563eb] text-white border-[#2563eb]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#2563eb]'
              )}
              aria-pressed={finalidade === f.v}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Tipo de Imóvel */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tipo de Imóvel</p>
        <select
          value={tipo}
          onChange={e => setParam('tipo', e.target.value)}
          aria-label="Tipo de imóvel"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        >
          <option value="">Todos os tipos</option>
          {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Faixa de Preço */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Faixa de Preço (R$)
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            value={precoMin}
            onChange={e => setParam('precoMin', e.target.value)}
            placeholder="Mín."
            aria-label="Preço mínimo"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
          <input
            type="number"
            value={precoMax}
            onChange={e => setParam('precoMax', e.target.value)}
            placeholder="Máx."
            aria-label="Preço máximo"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>
      </div>

      {/* Dormitórios */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dormitórios</p>
        <div className="flex gap-2">
          {['1', '2', '3', '4'].map(v => (
            <CountButton key={v} value={v} current={quartos} onClick={v => setParam('quartos', v)} />
          ))}
        </div>
      </div>

      {/* Banheiros */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Banheiros</p>
        <div className="flex gap-2">
          {['1', '2', '3', '4'].map(v => (
            <CountButton key={v} value={v} current={banheiros} onClick={v => setParam('banheiros', v)} />
          ))}
        </div>
      </div>

      {/* Área mínima */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Área Mínima (m²)</p>
        <input
          type="number"
          value={areaMin}
          onChange={e => setParam('areaMin', e.target.value)}
          placeholder="Ex: 50"
          aria-label="Área mínima"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>

      {/* v1.1: cidade e bairro do DF a partir dos imóveis cadastrados (antes: lista dos 27 estados) */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Localização</p>
        <div className="space-y-2">
          <select
            value={cidade}
            onChange={e => { setParam('cidade', e.target.value); setParam('bairro', ''); setParam('estado', '') }}
            aria-label="Cidade ou região"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            <option value="">Todas as cidades</option>
            {locations.map(l => <option key={l.city} value={l.city}>{l.city}</option>)}
          </select>
          {(() => {
            const current = locations.find(l => l.city.toLowerCase() === cidade.toLowerCase())
            const options = current ? current.neighborhoods : Array.from(new Set(locations.flatMap(l => l.neighborhoods))).sort()
            if (!options.length) return null
            return (
              <select
                value={bairro}
                onChange={e => setParam('bairro', e.target.value)}
                aria-label="Bairro ou setor"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              >
                <option value="">Todos os bairros</option>
                {options.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )
          })()}
        </div>
      </div>

      {/* Características */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Características</p>
        <div className="space-y-2">
          {FEATURES.map(f => (
            <label key={f.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={features.includes(f.value)}
                onChange={() => toggleFeature(f.value)}
                aria-label={f.label}
                className="w-4 h-4 rounded border-gray-300 text-[#1e3a8a] focus:ring-[#2563eb]"
              />
              <span className="text-sm text-gray-700">{f.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 flex-shrink-0" aria-label="Filtros de busca">
        <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
          <h2 className="font-semibold text-[#1e3a8a] mb-4 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </h2>
          {filterContent}
        </div>
      </aside>

      {/* Mobile filter button */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-[#1e3a8a] transition-colors"
          aria-expanded={mobileOpen}
          aria-controls="mobile-filters"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {hasFilters && (
            <span className="ml-1 w-5 h-5 bg-[#1e3a8a] text-white text-xs rounded-full flex items-center justify-center">
              {[transacao !== 'comprar', finalidade, tipo, precoMin, precoMax, quartos, banheiros, areaMin, cidade, bairro, features.length > 0].filter(Boolean).length}
            </span>
          )}
        </button>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex" id="mobile-filters" role="dialog" aria-modal="true" aria-label="Filtros">
            <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
            <div className="w-80 bg-white h-full overflow-y-auto p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[#1e3a8a] flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtros
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Fechar filtros"
                  className="p-1.5 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              {filterContent}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="mt-6 w-full py-3 bg-[#1e3a8a] text-white font-semibold rounded-xl text-sm"
              >
                Ver resultados
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
