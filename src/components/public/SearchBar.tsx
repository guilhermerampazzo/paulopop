'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal } from 'lucide-react'

const propertyTypes = [
  'Apartamento', 'Casa', 'Sobrado', 'Terreno', 'Sala Comercial',
  'Loja', 'Galpao', 'Predio', 'Chacara', 'Fazenda',
  'Studio', 'Kitnet', 'Cobertura', 'Flat', 'Mansao',
]

const bedroomOptions = [
  { value: '', label: 'Dormitorios' },
  { value: '1', label: '1 dormitorio' },
  { value: '2', label: '2 dormitorios' },
  { value: '3', label: '3 dormitorios' },
  { value: '4', label: '4+ dormitorios' },
]

const priceRanges = [
  { value: '', label: 'Faixa de preco' },
  { value: '0-200000', label: 'Ate R$ 200.000' },
  { value: '200000-500000', label: 'R$ 200 mil a R$ 500 mil' },
  { value: '500000-1000000', label: 'R$ 500 mil a R$ 1 mi' },
  { value: '1000000-2000000', label: 'R$ 1 mi a R$ 2 mi' },
  { value: '2000000-', label: 'Acima de R$ 2 mi' },
]

interface SearchBarProps {
  defaultTab?: 'comprar' | 'alugar'
}

export function SearchBar({ defaultTab = 'comprar' }: SearchBarProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'comprar' | 'alugar'>(defaultTab)
  const [query, setQuery] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [priceRange, setPriceRange] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()

    const params = new URLSearchParams()
    if (tab === 'alugar') params.set('transacao', 'alugar')
    if (query) params.set('q', query)
    if (propertyType) params.set('tipo', propertyType)
    if (bedrooms) params.set('quartos', bedrooms)

    if (priceRange) {
      const [min, max] = priceRange.split('-')
      if (min) params.set('precoMin', min)
      if (max) params.set('precoMax', max)
    }

    router.push(`/imoveis?${params.toString()}`)
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="inline-flex rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-md" role="tablist" aria-label="Tipo de transacao">
        {(['comprar', 'alugar'] as const).map(option => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={tab === option}
            onClick={() => setTab(option)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              tab === option
                ? 'bg-white text-[#1e3a8a] shadow-sm'
                : 'text-white/78 hover:text-white'
            }`}
          >
            {option === 'comprar' ? 'Comprar' : 'Alugar'}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSearch}
        className="mt-4 overflow-hidden rounded-[28px] border border-white/12 bg-white/96 p-4 shadow-[0_28px_80px_-42px_rgba(8,30,63,0.9)] backdrop-blur-xl sm:p-5"
        role="search"
        aria-label="Buscar imoveis"
      >
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          <SlidersHorizontal className="h-4 w-4 text-[#2563eb]" />
          Busca inteligente de imoveis
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.8fr))_auto]">
          <label className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-colors focus-within:border-[#2563eb] focus-within:ring-2 focus-within:ring-[#2563eb]/15">
            <Search className="h-4 w-4 text-slate-400 transition-colors group-focus-within:text-[#2563eb]" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Bairro, quadra, prédio ou código do imóvel"
              aria-label="Localização ou código do imóvel"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>

          <select
            value={propertyType}
            onChange={e => setPropertyType(e.target.value)}
            aria-label="Tipo de imovel"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
          >
            <option value="">Tipo de imovel</option>
            {propertyTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={bedrooms}
            onChange={e => setBedrooms(e.target.value)}
            aria-label="Número de dormitórios"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
          >
            {bedroomOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={priceRange}
            onChange={e => setPriceRange(e.target.value)}
            aria-label="Faixa de preco"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
          >
            {priceRanges.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1e3a8a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#172554]"
            aria-label="Buscar imoveis"
          >
            <Search className="h-4 w-4" />
            Buscar
          </button>
        </div>
      </form>
    </div>
  )
}
