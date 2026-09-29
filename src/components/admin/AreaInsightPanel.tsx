'use client'

/**
 * v1.3 — Painel "Viver aqui" (pesquisa de região) usado na ficha do imóvel, no empreendimento e na cidade.
 * Botão "Analisar região" → POST /api/admin/regiao; ajustes manuais → PUT /api/admin/regiao/[id].
 */
import { useEffect, useState } from 'react'
import { MapPinned, RefreshCw, Loader2, Plus, Trash2, EyeOff, Eye } from 'lucide-react'
import { CATEGORIES, TABS, type AreaData, type AreaManual } from '@/lib/area-insight-shared'

interface Insight { id: string; address: string; provider: string | null; fetchedAt: string | null; data: AreaData | null; manual: AreaManual | null }

export function AreaInsightPanel({ kind, id, address, insightId }: { kind: 'property' | 'empreendimento' | 'city'; id: string; address: string; insightId?: string | null }) {
  const [insight, setInsight] = useState<Insight | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [tab, setTab] = useState(TABS[0])
  const [manual, setManual] = useState<AreaManual>({ highlights: [], hidden: [], extraPlaces: [], summary: '' })

  useEffect(() => {
    if (!insightId) return
    fetch(`/api/admin/regiao/${insightId}`).then(r => r.ok ? r.json() : null).then(d => { if (d?.insight) { setInsight(d.insight); setManual({ highlights: [], hidden: [], extraPlaces: [], summary: '', ...(d.insight.manual ?? {}) }) } }).catch(() => {})
  }, [insightId])

  async function analyze(force = false) {
    if (!address || address.trim().length < 5) { setMsg('Preencha o endereço (cidade e bairro no mínimo) e salve antes de analisar.'); return }
    setLoading(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/regiao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, target: { kind, id }, force }) })
      const d = await res.json()
      if (!res.ok) { setMsg(d.error ?? 'Erro ao analisar'); return }
      setInsight(d.insight); setManual({ highlights: [], hidden: [], extraPlaces: [], summary: '', ...(d.insight.manual ?? {}) })
      setMsg(d.warning ?? 'Região analisada. Revise, oculte o que não interessa e escreva os destaques.')
    } finally { setLoading(false) }
  }

  async function save() {
    if (!insight) return
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(`/api/admin/regiao/${insight.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ manual }) })
      setMsg(res.ok ? 'Ajustes salvos.' : 'Erro ao salvar ajustes')
    } finally { setSaving(false) }
  }

  const toggleHidden = (pid: string) => setManual(m => ({ ...m, hidden: (m.hidden ?? []).includes(pid) ? (m.hidden ?? []).filter(x => x !== pid) : [...(m.hidden ?? []), pid] }))
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]'
  const cats = (insight?.data?.categories ?? []).filter(c => CATEGORIES.find(x => x.key === c.key)?.tab === tab)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#1e3a8a] flex items-center gap-2"><MapPinned className="h-4 w-4" /> Viver aqui — pesquisa de região</h3>
          <p className="text-xs text-gray-500">Comércio, escolas (públicas/particulares), saúde, transporte e trajetos no horário de pico a partir do endereço. Aparece no site como bloco &quot;Viver aqui&quot;.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => analyze(false)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-medium text-white hover:bg-[#c2410c] disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPinned className="h-4 w-4" />} {insight ? 'Analisar de novo' : 'Analisar região'}
          </button>
          {insight && <button type="button" onClick={() => analyze(true)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[#1e3a8a] px-3 py-2 text-sm text-[#1e3a8a] hover:bg-[#eff6ff]" title="Ignora o cache e consulta o Google novamente"><RefreshCw className="h-4 w-4" /> Atualizar</button>}
        </div>
      </div>
      {msg && <p className="rounded-lg bg-[#eff6ff] px-3 py-2 text-sm text-[#1e3a8a]">{msg}</p>}

      {insight && (
        <>
          <p className="text-xs text-gray-500">Endereço analisado: <strong>{insight.address}</strong> · Fonte: {insight.provider === 'google' ? 'Google Maps' : 'manual'} {insight.fetchedAt ? `· ${new Date(insight.fetchedAt).toLocaleDateString('pt-BR')}` : ''}</p>

          {insight.provider === 'google' && (
            <div>
              <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-3">
                {TABS.map(t => <button key={t} type="button" onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm rounded-t-lg ${tab === t ? 'bg-[#1e3a8a] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{t}</button>)}
              </div>
              {cats.length === 0 && <p className="text-sm text-gray-500">Nada encontrado nesta aba.</p>}
              {cats.map(c => (
                <div key={c.key} className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{c.label}</p>
                  <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                    {c.places.map(p => {
                      const hidden = (manual.hidden ?? []).includes(p.id)
                      return (
                        <li key={p.id} className={`flex items-center justify-between gap-2 px-3 py-1.5 text-sm ${hidden ? 'opacity-40' : ''}`}>
                          <span className="min-w-0 truncate">{p.name}{p.schoolKind ? <span className={`ml-2 rounded px-1.5 text-[10px] ${p.schoolKind === 'publica' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{p.schoolKind === 'publica' ? 'pública' : 'particular'}</span> : null}<span className="ml-2 text-xs text-gray-400">{p.distanceM} m · {p.walkMin} min a pé</span></span>
                          <button type="button" onClick={() => toggleHidden(p.id)} className="text-gray-500 hover:text-[#1e3a8a]" aria-label={hidden ? 'Mostrar no site' : 'Ocultar do site'}>{hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Destaques do corretor (aparecem no topo do bloco)</p>
            {(manual.highlights ?? []).map((h, i) => (
              <div key={i} className="mb-1 flex gap-2">
                <input value={h.text} onChange={e => setManual(m => ({ ...m, highlights: (m.highlights ?? []).map((x, j) => j === i ? { text: e.target.value } : x) }))} className={inputCls} placeholder="Ex.: Metrô Samambaia Sul a 450 m" aria-label={`Destaque ${i + 1}`} />
                <button type="button" onClick={() => setManual(m => ({ ...m, highlights: (m.highlights ?? []).filter((_, j) => j !== i) }))} className="text-red-500" aria-label="Remover destaque"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setManual(m => ({ ...m, highlights: [...(m.highlights ?? []), { text: '' }] }))} className="inline-flex items-center gap-1 text-sm text-[#2563eb]"><Plus className="h-4 w-4" /> Adicionar destaque</button>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Lugares adicionados à mão</p>
            {(manual.extraPlaces ?? []).map((e, i) => (
              <div key={i} className="mb-1 grid grid-cols-1 gap-1 md:grid-cols-[160px_1fr_110px_auto]">
                <select value={e.category} onChange={ev => setManual(m => ({ ...m, extraPlaces: (m.extraPlaces ?? []).map((x, j) => j === i ? { ...x, category: ev.target.value } : x) }))} className={inputCls} aria-label="Categoria">{CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
                <input value={e.name} onChange={ev => setManual(m => ({ ...m, extraPlaces: (m.extraPlaces ?? []).map((x, j) => j === i ? { ...x, name: ev.target.value } : x) }))} className={inputCls} placeholder="Nome" aria-label="Nome do lugar" />
                <input type="number" value={e.distanceM ?? ''} onChange={ev => setManual(m => ({ ...m, extraPlaces: (m.extraPlaces ?? []).map((x, j) => j === i ? { ...x, distanceM: Number(ev.target.value) } : x) }))} className={inputCls} placeholder="metros" aria-label="Distância em metros" />
                <button type="button" onClick={() => setManual(m => ({ ...m, extraPlaces: (m.extraPlaces ?? []).filter((_, j) => j !== i) }))} className="text-red-500" aria-label="Remover lugar"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setManual(m => ({ ...m, extraPlaces: [...(m.extraPlaces ?? []), { category: 'metro', name: '' }] }))} className="inline-flex items-center gap-1 text-sm text-[#2563eb]"><Plus className="h-4 w-4" /> Adicionar lugar</button>
          </div>

          <div>
            <label htmlFor={`ai-summary-${id}`} className="text-sm font-medium text-gray-700">Resumo curto (2 frases)</label>
            <textarea id={`ai-summary-${id}`} value={manual.summary ?? ''} onChange={e => setManual(m => ({ ...m, summary: e.target.value }))} rows={2} className={inputCls} placeholder="Ex.: Quadra a 5 minutos a pé do metrô, com supermercado e escolas públicas no entorno." />
          </div>
          <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#172554] disabled:opacity-60">{saving ? 'Salvando…' : 'Salvar ajustes da região'}</button>
        </>
      )}
    </div>
  )
}
