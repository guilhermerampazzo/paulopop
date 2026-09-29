'use client'

/**
 * v1.3 — formulários dos tipos que consultam o banco: imóveis e empreendimentos
 * (modo automático por cidade/bairro ou seleção manual por busca).
 */
import { useEffect, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import type { SectionProperties, SectionEmpreendimentos } from '@/lib/sections'
import { Select, TextInput, btnSmall, inputCls } from './shared'

/** Chips de nomes de cidade/bairro: multi-seleção das sugestões + texto livre. */
function CityNamesPicker({ value, onChange, suggestions }: { value: string[]; onChange: (v: string[]) => void; suggestions: string[] }) {
  const [free, setFree] = useState('')
  const toggle = (n: string) => onChange(value.includes(n) ? value.filter(v => v !== n) : [...value, n])
  const add = () => {
    const n = free.trim()
    if (n && !value.includes(n)) onChange([...value, n])
    setFree('')
  }
  return (
    <div>
      <span className="block text-xs font-medium text-gray-700 mb-1">Cidades / bairros</span>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {suggestions.map(n => (
            <button key={n} type="button" onClick={() => toggle(n)} aria-pressed={value.includes(n)}
              className={`rounded-full border px-2.5 py-1 text-xs ${value.includes(n) ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              {n}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1 mb-2">
        {value.filter(v => !suggestions.includes(v)).map(n => (
          <span key={n} className="inline-flex items-center gap-1 rounded-full bg-[#eff6ff] px-2.5 py-1 text-xs text-[#1e3a8a]">
            {n}
            <button type="button" onClick={() => toggle(n)} aria-label={`Remover ${n}`}><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input aria-label="Outro nome de cidade ou bairro" value={free} onChange={e => setFree(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="Outro nome (Enter para adicionar)" className={inputCls} />
        <button type="button" onClick={add} className={btnSmall}>Adicionar</button>
      </div>
      <p className="mt-1 text-[11px] text-gray-500">Vazio = usa os nomes da própria página.</p>
    </div>
  )
}

interface PropertyHit { id: string; ref?: string | null; title?: string | null; city?: string | null; status?: string }

export function PropertiesForm({ section, onChange, cityNames }: { section: SectionProperties; onChange: (s: SectionProperties) => void; cityNames: string[] }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<PropertyHit[]>([])
  const [busy, setBusy] = useState(false)
  const [labels, setLabels] = useState<Record<string, string>>({})
  const ids = section.propertyIds ?? []

  async function search() {
    setBusy(true)
    try {
      // A rota lista os imóveis do painel; o filtro por referência/título é feito aqui.
      const res = await fetch(`/api/imoveis?admin=true&limit=50&q=${encodeURIComponent(q)}`)
      const data = await res.json()
      const list: PropertyHit[] = (data.properties ?? []).map((p: PropertyHit) => ({ id: p.id, ref: p.ref, title: p.title, city: p.city, status: p.status }))
      const needle = q.trim().toLowerCase()
      setHits(needle ? list.filter(p => `${p.ref ?? ''} ${p.title ?? ''} ${p.city ?? ''}`.toLowerCase().includes(needle)) : list)
    } finally {
      setBusy(false)
    }
  }

  // Rótulos dos IDs já selecionados (para mostrar ref/título em vez do id)
  useEffect(() => {
    const missing = ids.filter(id => !labels[id])
    if (!missing.length) return
    let cancelled = false
    Promise.all(missing.map(id => fetch(`/api/imoveis/${id}`).then(r => (r.ok ? r.json() : null)).catch(() => null)))
      .then(rows => {
        if (cancelled) return
        const next: Record<string, string> = {}
        rows.forEach((p, i) => { next[missing[i]] = p ? `${p.ref ?? ''} · ${p.title ?? ''}`.trim() : missing[i] })
        setLabels(l => ({ ...l, ...next }))
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')])

  const add = (p: PropertyHit) => {
    if (ids.includes(p.id)) return
    setLabels(l => ({ ...l, [p.id]: `${p.ref ?? ''} · ${p.title ?? ''}`.trim() }))
    onChange({ ...section, propertyIds: [...ids, p.id] })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select label="Modo" value={section.mode} onChange={v => onChange({ ...section, mode: v as SectionProperties['mode'] })}
          options={[{ value: 'auto', label: 'Automático (por cidade/bairro)' }, { value: 'manual', label: 'Manual (escolher imóveis)' }]} />
        <Select label="Transação" value={section.transactionType ?? 'ALL'} onChange={v => onChange({ ...section, transactionType: v as SectionProperties['transactionType'] })}
          options={[{ value: 'ALL', label: 'Venda e aluguel' }, { value: 'SALE', label: 'Só venda' }, { value: 'RENT', label: 'Só aluguel' }]} />
        <TextInput label="Limite" type="number" value={String(section.limit ?? 8)} onChange={v => onChange({ ...section, limit: Math.max(1, Math.min(24, parseInt(v) || 8)) })} />
      </div>
      {section.mode === 'auto' ? (
        <CityNamesPicker value={section.cityNames ?? []} onChange={cityNames => onChange({ ...section, cityNames })} suggestions={cityNames} />
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input aria-label="Buscar imóvel por referência ou título" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void search() } }} placeholder="Referência ou título" className={inputCls} />
            <button type="button" onClick={() => void search()} className={btnSmall} disabled={busy}>{busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />} Buscar</button>
          </div>
          {hits.length > 0 && (
            <ul className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
              {hits.map(p => (
                <li key={p.id}>
                  <button type="button" onClick={() => add(p)} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex justify-between gap-2">
                    <span className="min-w-0 truncate"><span className="font-mono text-xs text-gray-500 mr-2">{p.ref}</span>{p.title}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{p.city} · {p.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-1">
            {ids.map(id => (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-[#eff6ff] px-2.5 py-1 text-xs text-[#1e3a8a]">
                {labels[id] ?? id}
                <button type="button" aria-label="Remover imóvel" onClick={() => onChange({ ...section, propertyIds: ids.filter(x => x !== id) })}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {ids.length === 0 && <span className="text-xs text-gray-500">Nenhum imóvel selecionado.</span>}
          </div>
        </div>
      )}
    </div>
  )
}

interface EmpHit { id: string; name: string; city?: string | null; status?: string }

export function EmpreendimentosForm({ section, onChange, cityNames }: { section: SectionEmpreendimentos; onChange: (s: SectionEmpreendimentos) => void; cityNames: string[] }) {
  const [all, setAll] = useState<EmpHit[]>([])
  const [q, setQ] = useState('')
  const ids = section.empreendimentoIds ?? []

  useEffect(() => {
    if (section.mode !== 'manual') return
    fetch('/api/empreendimentos?admin=true&limit=50').then(r => r.json())
      .then(d => setAll((d.empreendimentos ?? []).map((e: EmpHit) => ({ id: e.id, name: e.name, city: e.city, status: e.status }))))
      .catch(() => setAll([]))
  }, [section.mode])

  const byId = new Map(all.map(e => [e.id, e]))
  const filtered = all.filter(e => !q || e.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select label="Modo" value={section.mode} onChange={v => onChange({ ...section, mode: v as SectionEmpreendimentos['mode'] })}
          options={[{ value: 'auto', label: 'Automático (por cidade)' }, { value: 'manual', label: 'Manual (escolher)' }]} />
        <TextInput label="Limite" type="number" value={String(section.limit ?? 6)} onChange={v => onChange({ ...section, limit: Math.max(1, Math.min(24, parseInt(v) || 6)) })} />
      </div>
      {section.mode === 'auto' ? (
        <CityNamesPicker value={section.cityNames ?? []} onChange={cityNames => onChange({ ...section, cityNames })} suggestions={cityNames} />
      ) : (
        <div className="space-y-2">
          <input aria-label="Filtrar empreendimentos" value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrar por nome" className={inputCls} />
          <ul className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
            {filtered.map(e => {
              const on = ids.includes(e.id)
              return (
                <li key={e.id}>
                  <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={on} onChange={() => onChange({ ...section, empreendimentoIds: on ? ids.filter(x => x !== e.id) : [...ids, e.id] })} className="rounded border-gray-300" />
                    <span className="min-w-0 truncate">{e.name}</span>
                    <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{e.city} · {e.status}</span>
                  </label>
                </li>
              )
            })}
            {filtered.length === 0 && <li className="px-3 py-2 text-xs text-gray-500">Nenhum empreendimento.</li>}
          </ul>
          <div className="flex flex-wrap gap-1">
            {ids.map(id => (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-[#eff6ff] px-2.5 py-1 text-xs text-[#1e3a8a]">
                {byId.get(id)?.name ?? id}
                <button type="button" aria-label="Remover empreendimento" onClick={() => onChange({ ...section, empreendimentoIds: ids.filter(x => x !== id) })}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
