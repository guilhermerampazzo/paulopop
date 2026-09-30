'use client'

/**
 * v1.2 — Estrutura do empreendimento: blocos (andares × apartamentos por andar), tipologias por final
 * e a matriz de unidades gerada, com o imóvel ligado a cada unidade.
 */
import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Save, Loader2, RefreshCw, Grid3X3, Upload } from 'lucide-react'
import { unitFinal } from '@/lib/empreendimento-units'

interface Block { id?: string; name: string; floors: number; unitsPerFloor: number; firstFloor: number; numbering: 'FLOOR_SEQ' | 'SEQ' }
interface UnitType { id?: string; name: string; bedrooms?: number | null; suites?: number | null; bathrooms?: number | null; area?: number | null; parking?: number | null; sunPosition?: string | null; finals?: string | null
  // v1.4
  floorsLabel?: string | null; totalArea?: number | null; balconies?: number | null; priceFrom?: number | null; description?: string | null; floorPlanUrl?: string | null }
interface Unit { id: string; blockId: string; floor: number; number: string; unitTypeId: string | null; properties: Array<{ id: string; ref: string; status: string; transactionType: string; price: string | null; slug: string }> }

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-green-500 text-white', SOLD: 'bg-red-500 text-white', RENTED: 'bg-orange-500 text-white', DRAFT: 'bg-yellow-300 text-yellow-900',
}

export function EstruturaEditor({ empreendimentoId }: { empreendimentoId: string }) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [types, setTypes] = useState<UnitType[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/empreendimentos/${empreendimentoId}/estrutura`)
      .then(r => r.json())
      .then(d => { setBlocks(d.blocks ?? []); setTypes(d.unitTypes ?? []); setUnits(d.units ?? []) })
      .finally(() => setLoading(false))
  }, [empreendimentoId])

  async function save(regenerate = false) {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(`/api/admin/empreendimentos/${empreendimentoId}/estrutura`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks, unitTypes: types, regenerate }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'Erro ao salvar')
      setBlocks(d.blocks ?? []); setTypes(d.unitTypes ?? []); setUnits(d.units ?? [])
      setMsg(`Estrutura salva: ${d.total} unidades (${d.created} novas).`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  // v1.4: campos novos da tipologia
  const setType = (i: number, patch: Partial<UnitType>) => setTypes(a => a.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const numOrNull = (v: string) => (v === '' ? null : Number(v))
  async function uploadPlan(i: number, file: File | undefined) {
    if (!file) return
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) { setMsg('Não foi possível enviar a planta.'); return }
    const j = await res.json() as { url: string }
    setType(i, { floorPlanUrl: j.url })
  }

  const typeById = useMemo(() => new Map(types.filter(t => t.id).map(t => [t.id as string, t])), [types])
  const inputCls = 'w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]'
  const numberSet = (setter: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => setter(Number(e.target.value) || 0)

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#2563eb]" /></div>

  return (
    <div className="space-y-6">
      {/* Tipologias */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[#1e3a8a]">Tipologias</h2>
            <p className="text-xs text-gray-500">Tipos de apartamento do prédio. Os <strong>finais</strong> (ex.: 01,02,05) dizem quais apartamentos são de cada tipo. Nome, andares, quartos, áreas, vagas, posição, preço inicial e planta aparecem na página do empreendimento.</p>
          </div>
          <button type="button" onClick={() => setTypes(t => [...t, { name: '', bedrooms: 2, suites: 0, bathrooms: 1, parking: 1, finals: '', floorsLabel: '' }])} className="inline-flex items-center gap-1 rounded-lg border border-[#2563eb] px-3 py-1.5 text-sm text-[#2563eb] hover:bg-blue-50"><Plus className="h-4 w-4" /> Tipologia</button>
        </div>
        {types.length === 0 && <p className="text-sm text-gray-400">Nenhuma tipologia ainda. Ex.: “2 quartos com suíte”, 50 m², 1 vaga, finais 01,02.</p>}
        <div className="space-y-3">
          {types.map((t, i) => (
            <div key={t.id ?? `n${i}`} className="grid grid-cols-2 md:grid-cols-9 gap-2 items-end rounded-xl bg-[#F0F4F8] p-3">
              <div className="col-span-2"><label className="text-[11px] text-gray-500">Nome</label><input value={t.name} onChange={e => setTypes(a => a.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className={inputCls} placeholder="2 quartos com suíte" /></div>
              <div><label className="text-[11px] text-gray-500">Quartos</label><input type="number" value={t.bedrooms ?? ''} onChange={e => setTypes(a => a.map((x, j) => j === i ? { ...x, bedrooms: e.target.value === '' ? null : Number(e.target.value) } : x))} className={inputCls} /></div>
              <div><label className="text-[11px] text-gray-500">Suítes</label><input type="number" value={t.suites ?? ''} onChange={e => setTypes(a => a.map((x, j) => j === i ? { ...x, suites: e.target.value === '' ? null : Number(e.target.value) } : x))} className={inputCls} /></div>
              <div><label className="text-[11px] text-gray-500">Banh.</label><input type="number" value={t.bathrooms ?? ''} onChange={e => setTypes(a => a.map((x, j) => j === i ? { ...x, bathrooms: e.target.value === '' ? null : Number(e.target.value) } : x))} className={inputCls} /></div>
              <div><label className="text-[11px] text-gray-500">Área m²</label><input type="number" step="0.01" value={t.area ?? ''} onChange={e => setTypes(a => a.map((x, j) => j === i ? { ...x, area: e.target.value === '' ? null : Number(e.target.value) } : x))} className={inputCls} /></div>
              <div><label className="text-[11px] text-gray-500">Vagas</label><input type="number" value={t.parking ?? ''} onChange={e => setTypes(a => a.map((x, j) => j === i ? { ...x, parking: e.target.value === '' ? null : Number(e.target.value) } : x))} className={inputCls} /></div>
              <div><label className="text-[11px] text-gray-500">Finais</label><input value={t.finals ?? ''} onChange={e => setTypes(a => a.map((x, j) => j === i ? { ...x, finals: e.target.value } : x))} className={inputCls} placeholder="01,02" /></div>
              <div className="flex items-end justify-end"><button type="button" aria-label="Remover tipologia" onClick={() => setTypes(a => a.filter((_, j) => j !== i))} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div>
              {/* v1.4: segunda linha da tipologia */}
              <div className="col-span-2"><label className="text-[11px] text-gray-500" htmlFor={`tp-and-${i}`}>Andar(es)</label><input id={`tp-and-${i}`} value={t.floorsLabel ?? ''} onChange={e => setType(i, { floorsLabel: e.target.value })} className={inputCls} placeholder="1º ao 12º (vazio = pelos finais)" /></div>
              <div><label className="text-[11px] text-gray-500" htmlFor={`tp-var-${i}`}>Varandas</label><input id={`tp-var-${i}`} type="number" value={t.balconies ?? ''} onChange={e => setType(i, { balconies: numOrNull(e.target.value) })} className={inputCls} /></div>
              <div><label className="text-[11px] text-gray-500" htmlFor={`tp-at-${i}`}>Área total m²</label><input id={`tp-at-${i}`} type="number" step="0.01" value={t.totalArea ?? ''} onChange={e => setType(i, { totalArea: numOrNull(e.target.value) })} className={inputCls} /></div>
              <div className="col-span-2"><label className="text-[11px] text-gray-500" htmlFor={`tp-sol-${i}`}>Posição solar</label>
                <select id={`tp-sol-${i}`} value={t.sunPosition ?? ''} onChange={e => setType(i, { sunPosition: e.target.value || null })} className={inputCls}>
                  <option value="">—</option><option>Nascente</option><option>Poente</option><option>Norte</option><option>Sul</option><option>Nascente e poente</option>
                </select>
              </div>
              <div className="col-span-2"><label className="text-[11px] text-gray-500" htmlFor={`tp-pr-${i}`}>A partir de (R$)</label><input id={`tp-pr-${i}`} type="number" value={t.priceFrom ?? ''} onChange={e => setType(i, { priceFrom: numOrNull(e.target.value) })} className={inputCls} /></div>
              <div className="flex items-end">
                <label className="inline-flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                  <Upload className="h-3.5 w-3.5" /> {t.floorPlanUrl ? 'Trocar planta' : 'Planta'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => void uploadPlan(i, e.target.files?.[0])} />
                </label>
              </div>
              <div className="col-span-2 md:col-span-9"><label className="text-[11px] text-gray-500" htmlFor={`tp-desc-${i}`}>Descrição da tipologia</label><input id={`tp-desc-${i}`} value={t.description ?? ''} onChange={e => setType(i, { description: e.target.value })} className={inputCls} placeholder="Sala em dois ambientes, cozinha americana, varanda com churrasqueira" maxLength={1000} />
                {t.floorPlanUrl && <p className="mt-1 text-[11px] text-gray-500">Planta enviada: <a href={t.floorPlanUrl} target="_blank" rel="noopener noreferrer" className="text-[#2563eb] underline">ver</a> · <button type="button" className="text-red-600 underline" onClick={() => setType(i, { floorPlanUrl: null })}>remover</button></p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Blocos */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[#1e3a8a]">Blocos e andares</h2>
            <p className="text-xs text-gray-500">Andares × apartamentos por andar geram a matriz (ex.: 101 a 104, 201 a 204…). Térreo = primeiro andar 0.</p>
          </div>
          <button type="button" onClick={() => setBlocks(b => [...b, { name: `Bloco ${String.fromCharCode(65 + b.length)}`, floors: 4, unitsPerFloor: 4, firstFloor: 1, numbering: 'FLOOR_SEQ' }])} className="inline-flex items-center gap-1 rounded-lg border border-[#2563eb] px-3 py-1.5 text-sm text-[#2563eb] hover:bg-blue-50"><Plus className="h-4 w-4" /> Bloco</button>
        </div>
        {blocks.length === 0 && <p className="text-sm text-gray-400">Nenhum bloco ainda. Prédio único? Crie um bloco só (“Torre única”).</p>}
        <div className="space-y-3">
          {blocks.map((b, i) => (
            <div key={b.id ?? `n${i}`} className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end rounded-xl bg-[#F0F4F8] p-3">
              <div className="col-span-2"><label className="text-[11px] text-gray-500">Nome</label><input value={b.name} onChange={e => setBlocks(a => a.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className={inputCls} /></div>
              <div><label className="text-[11px] text-gray-500">Andares</label><input type="number" min={1} value={b.floors} onChange={numberSet(v => setBlocks(a => a.map((x, j) => j === i ? { ...x, floors: v } : x)))} className={inputCls} /></div>
              <div><label className="text-[11px] text-gray-500">Aptos/andar</label><input type="number" min={1} value={b.unitsPerFloor} onChange={numberSet(v => setBlocks(a => a.map((x, j) => j === i ? { ...x, unitsPerFloor: v } : x)))} className={inputCls} /></div>
              <div><label className="text-[11px] text-gray-500">1º andar</label><input type="number" min={0} value={b.firstFloor} onChange={numberSet(v => setBlocks(a => a.map((x, j) => j === i ? { ...x, firstFloor: v } : x)))} className={inputCls} /></div>
              <div><label className="text-[11px] text-gray-500">Numeração</label>
                <select value={b.numbering} onChange={e => setBlocks(a => a.map((x, j) => j === i ? { ...x, numbering: e.target.value as 'FLOOR_SEQ' | 'SEQ' } : x))} className={inputCls}>
                  <option value="FLOOR_SEQ">101, 102…</option>
                  <option value="SEQ">1, 2, 3…</option>
                </select>
              </div>
              <div className="flex items-end justify-end"><button type="button" aria-label="Remover bloco" onClick={() => setBlocks(a => a.filter((_, j) => j !== i))} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button type="button" onClick={() => save(false)} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#172554] disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar e gerar unidades
          </button>
          <button type="button" onClick={() => save(true)} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className="h-4 w-4" /> Reaplicar tipologias pelos finais
          </button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </div>

      {/* Matriz */}
      {units.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
          <h2 className="font-semibold text-[#1e3a8a] flex items-center gap-2"><Grid3X3 className="h-4 w-4" /> Matriz de unidades ({units.length})</h2>
          <p className="text-xs text-gray-500">Verde = à venda/locação no site · Vermelho = vendido · Laranja = alugado · Amarelo = rascunho · Cinza = sem anúncio. Ligue um imóvel a uma unidade na ficha do imóvel (Principal → Empreendimento → Unidade).</p>
          {blocks.filter(b => b.id).map(b => {
            const bu = units.filter(u => u.blockId === b.id)
            const floors = Array.from(new Set(bu.map(u => u.floor))).sort((a, c) => c - a)
            return (
              <div key={b.id} className="overflow-x-auto">
                <p className="mb-2 text-sm font-semibold text-gray-700">{b.name}</p>
                <table className="text-xs">
                  <tbody>
                    {floors.map(f => (
                      <tr key={f}>
                        <td className="pr-2 py-0.5 text-gray-400 whitespace-nowrap">{f === 0 ? 'Térreo' : `${f}º`}</td>
                        {bu.filter(u => u.floor === f).map(u => {
                          const p = u.properties[0]
                          const t = u.unitTypeId ? typeById.get(u.unitTypeId) : undefined
                          const cls = p ? (STATUS_COLOR[p.status] ?? 'bg-gray-400 text-white') : 'bg-gray-100 text-gray-600'
                          const title = `${u.number}${t ? ` · ${t.name}` : ''}${p ? ` · ${p.ref} (${p.status})` : ' · sem anúncio'}`
                          return (
                            <td key={u.id} className="p-0.5">
                              {p ? (
                                <a href={`/admin/imoveis/${p.id}`} title={title} className={`block min-w-[44px] rounded px-1.5 py-1 text-center font-medium ${cls}`}>{u.number}</a>
                              ) : (
                                <span title={title} className={`block min-w-[44px] rounded px-1.5 py-1 text-center ${cls}`}>{u.number}<span className="block text-[9px] opacity-70">{t ? unitFinal(u.number) && t.name.slice(0, 12) : '—'}</span></span>
                              )}
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
      )}
    </div>
  )
}
