'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Search, Copy, Check, KeyRound, Trash2, ExternalLink, Plus, AlertTriangle } from 'lucide-react'
import { fmtBRL } from '@/lib/market-study'

const TABS = [['enderecos', 'Endereços'], ['banco', 'Banco de amostras'], ['buscas', 'Buscas'], ['regioes', 'Regiões'], ['conector', 'Conector do Claude']] as const
type Tab = (typeof TABS)[number][0]
const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]'
const card = 'rounded-2xl border border-gray-200 bg-white p-5'
const dt = (v: string | null | undefined) => (v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—')

interface Quadra { id: string; city: string; sector: string | null; series: number | null; quadra: string; type: string | null; searchTerms: string[]; notes: string | null; active: boolean; mapX: number | null; mapY: number | null }
interface BankItem { id: string; url: string; portal: string | null; title: string | null; location: string | null; quadra: string | null; price: string | null; areaPrivate: string | null; bedrooms: number | null; lastSeenAt: string; firstSeenAt: string; priceHistory: Array<{ date: string; price: number }> | null; _count: { samples: number } }
interface Run { id: string; source: string; step: string | null; quadra: string | null; portal: string | null; query: string | null; found: number; read: number; registered: number; createdAt: string; study: { id: string; title: string } }
interface Region { id: string; city: string; name: string; series: number[]; confirmed: string | null; market: string | null }
interface Token { id: string; name: string; prefix: string; lastUsedAt: string | null; revokedAt: string | null; createdAt: string; user: { name: string } }

export function InteligenciaClient({ admin, initialTab }: { admin: boolean; initialTab?: string }) {
  const [tab, setTab] = useState<Tab>(TABS.some(t => t[0] === initialTab) ? (initialTab as Tab) : 'enderecos')
  return (
    <>
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1" role="tablist">
        {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${tab === k ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>)}
      </div>
      {tab === 'enderecos' && <Enderecos admin={admin} />}
      {tab === 'banco' && <Banco admin={admin} />}
      {tab === 'buscas' && <Buscas />}
      {tab === 'regioes' && <Regioes admin={admin} />}
      {tab === 'conector' && <Conector />}
    </>
  )
}

// ─── Endereços ────────────────────────────────────────────────────────────────

function Enderecos({ admin }: { admin: boolean }) {
  const [rows, setRows] = useState<Quadra[] | null>(null)
  const [cities, setCities] = useState<Array<{ city: string; count: number }>>([])
  const [q, setQ] = useState('')
  const [serie, setSerie] = useState('')
  const [edit, setEdit] = useState<{ id: string; terms: string; notes: string } | null>(null)
  const [novo, setNovo] = useState<{ city: string; quadra: string; sector: string } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/inteligencia/quadras')
    if (res.ok) { const d = await res.json(); setRows(d.quadras); setCities(d.cities) }
  }, [])
  useEffect(() => { void load() }, [load])

  const series = useMemo(() => Array.from(new Set((rows ?? []).map(r => r.series).filter((s): s is number => s != null))).sort((a, b) => a - b), [rows])
  const shown = useMemo(() => (rows ?? []).filter(r => (!serie || String(r.series) === serie) && (!q || `${r.quadra} ${r.sector ?? ''} ${r.searchTerms.join(' ')}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, serie])

  async function save() {
    if (!edit) return
    const res = await fetch('/api/admin/inteligencia/quadras', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: edit.id, searchTerms: edit.terms, notes: edit.notes }) })
    if (res.ok) { setEdit(null); setMsg('Quadra atualizada.'); await load() } else setMsg((await res.json().catch(() => ({}))).error ?? 'Erro ao salvar.')
  }
  async function toggle(r: Quadra) {
    await fetch('/api/admin/inteligencia/quadras', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id, active: !r.active }) })
    await load()
  }
  async function create() {
    if (!novo) return
    const res = await fetch('/api/admin/inteligencia/quadras', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novo) })
    const d = await res.json().catch(() => ({}))
    if (res.ok) { setNovo(null); setMsg('Quadra acrescentada. Sem posição no mapa ela não entra na ordem das vizinhas.'); await load() } else setMsg(d.error ?? 'Erro ao criar.')
  }

  if (!rows) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#2563eb]" /></div>
  return (
    <div className="space-y-4">
      <div className={card}>
        <p className="text-sm text-gray-600">{cities.map(c => `${c.city}: ${c.count} quadras`).join(' · ') || 'Base vazia'}. A pesquisa de amostras começa pela quadra do imóvel, passa pelas de mesma numeração (QR/QN/QS) e segue pelas vizinhas, da mais próxima para a mais distante.</p>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar quadra, setor ou termo (ex.: QR 303)" className={`${inputCls} pl-9`} aria-label="Buscar quadra" /></div>
          <select value={serie} onChange={e => setSerie(e.target.value)} className={`${inputCls} md:w-48`} aria-label="Série"><option value="">Todas as séries</option>{series.map(s => <option key={s} value={s}>Série {s}</option>)}</select>
          {admin && <button type="button" onClick={() => setNovo({ city: cities[0]?.city ?? '', quadra: '', sector: '' })} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"><Plus className="h-4 w-4" /> Nova quadra</button>}
        </div>
        {novo && (
          <div className="mt-3 grid gap-2 rounded-xl bg-[#F0F4F8] p-3 md:grid-cols-4">
            <input value={novo.city} onChange={e => setNovo({ ...novo, city: e.target.value })} placeholder="Cidade (ex.: Taguatinga)" className={inputCls} aria-label="Cidade" />
            <input value={novo.quadra} onChange={e => setNovo({ ...novo, quadra: e.target.value })} placeholder="Quadra (ex.: QNL 10)" className={inputCls} aria-label="Quadra" />
            <input value={novo.sector} onChange={e => setNovo({ ...novo, sector: e.target.value })} placeholder="Setor (opcional)" className={inputCls} aria-label="Setor" />
            <div className="flex gap-2"><button type="button" onClick={create} className="flex-1 rounded-lg bg-[#1e3a8a] px-3 py-2 text-sm font-medium text-white">Acrescentar</button><button type="button" onClick={() => setNovo(null)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">Cancelar</button></div>
          </div>
        )}
        {msg && <p className="mt-2 text-sm text-green-700" role="status">{msg}</p>}
      </div>
      <div className={`${card} overflow-x-auto`}>
        <p className="mb-2 text-xs text-gray-500">{shown.length} quadra(s)</p>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="py-2">Quadra</th><th>Setor</th><th>Tipo</th><th>Termos de busca</th><th>Observações</th>{admin && <th></th>}</tr></thead>
          <tbody>
            {shown.slice(0, 400).map(r => (
              <tr key={r.id} className={`border-t border-gray-100 align-top ${r.active ? '' : 'opacity-50'}`}>
                <td className="py-1.5 font-medium text-[#1e3a8a] whitespace-nowrap">{r.quadra}{r.mapX == null ? <span title="Sem posição no mapa" className="ml-1 text-amber-600">•</span> : null}</td>
                <td>{r.sector ?? '—'}</td>
                <td className="text-xs text-gray-600">{r.type ?? '—'}</td>
                <td className="text-xs">{edit?.id === r.id ? <input value={edit.terms} onChange={e => setEdit({ ...edit, terms: e.target.value })} className={inputCls} aria-label="Termos de busca (separados por vírgula)" /> : r.searchTerms.join(', ')}</td>
                <td className="text-xs text-gray-600">{edit?.id === r.id ? <input value={edit.notes} onChange={e => setEdit({ ...edit, notes: e.target.value })} className={inputCls} aria-label="Observações" /> : r.notes ?? ''}</td>
                {admin && <td className="whitespace-nowrap text-right text-xs">
                  {edit?.id === r.id
                    ? <><button type="button" onClick={save} className="font-medium text-green-700 hover:underline">salvar</button> · <button type="button" onClick={() => setEdit(null)} className="text-gray-500 hover:underline">cancelar</button></>
                    : <><button type="button" onClick={() => setEdit({ id: r.id, terms: r.searchTerms.join(', '), notes: r.notes ?? '' })} className="text-[#2563eb] hover:underline">editar</button> · <button type="button" onClick={() => void toggle(r)} className="text-gray-500 hover:underline">{r.active ? 'desativar' : 'ativar'}</button></>}
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length > 400 && <p className="mt-2 text-xs text-gray-400">Mostrando 400 de {shown.length}. Use a busca para filtrar.</p>}
      </div>
    </div>
  )
}

// ─── Banco de amostras ────────────────────────────────────────────────────────

function Banco({ admin }: { admin: boolean }) {
  const [d, setD] = useState<{ total: number; page: number; pages: number; items: BankItem[]; portals: Array<{ portal: string; count: number }> } | null>(null)
  const [q, setQ] = useState('')
  const [portal, setPortal] = useState('')
  const [page, setPage] = useState(1)
  const load = useCallback(async () => {
    const sp = new URLSearchParams({ page: String(page) }); if (q) sp.set('q', q); if (portal) sp.set('portal', portal)
    const res = await fetch(`/api/admin/inteligencia/banco?${sp}`)
    if (res.ok) setD(await res.json())
  }, [q, portal, page])
  useEffect(() => { const t = setTimeout(() => void load(), 250); return () => clearTimeout(t) }, [load])
  async function remove(id: string) {
    if (!window.confirm('Tirar este anúncio do banco de amostras? As amostras dos estudos não mudam.')) return
    await fetch(`/api/admin/inteligencia/banco?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); await load()
  }
  if (!d) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#2563eb]" /></div>
  return (
    <div className="space-y-4">
      <div className={card}>
        <p className="text-sm text-gray-600">Todo anúncio lido para um estudo fica guardado aqui (um registro por link). Na próxima avaliação da mesma região, a busca começa por estes anúncios. {d.total} anúncio(s){d.portals.length ? ` · ${d.portals.map(p => `${p.portal}: ${p.count}`).join(' · ')}` : ''}.</p>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Buscar por quadra, local, título ou link" className={inputCls} aria-label="Buscar no banco" />
          <select value={portal} onChange={e => { setPortal(e.target.value); setPage(1) }} className={`${inputCls} md:w-52`} aria-label="Portal"><option value="">Todos os portais</option>{d.portals.map(p => <option key={p.portal} value={p.portal}>{p.portal}</option>)}</select>
        </div>
      </div>
      <div className={`${card} overflow-x-auto`}>
        {d.items.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">O banco ainda está vazio. Ele se enche sozinho a cada pesquisa de amostras.</p> : (
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="py-2">Anúncio</th><th>Quadra</th><th className="text-right">Preço</th><th className="text-right">Área</th><th className="text-right">R$/m²</th><th>Visto em</th><th className="text-right">Estudos</th><th></th></tr></thead>
            <tbody>{d.items.map(it => {
              const p = it.price ? Number(it.price) : null, a = it.areaPrivate ? Number(it.areaPrivate) : null
              const hist = Array.isArray(it.priceHistory) ? it.priceHistory : []
              return (
                <tr key={it.id} className="border-t border-gray-100 align-top">
                  <td className="py-1.5"><a href={it.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-[#2563eb] hover:underline"><ExternalLink className="mt-0.5 h-3 w-3 flex-shrink-0" /><span className="line-clamp-2">{it.location ?? it.title ?? it.url}</span></a><span className="block text-xs text-gray-500">{it.portal ?? 'Outro'}{it.bedrooms != null ? ` · ${it.bedrooms} qto(s)` : ''}</span></td>
                  <td className="whitespace-nowrap">{it.quadra ?? '—'}</td>
                  <td className="text-right whitespace-nowrap">{fmtBRL(p, 0)}{hist.length > 1 ? <span className="block text-[11px] text-gray-400" title={hist.map(h => `${h.date}: ${fmtBRL(h.price, 0)}`).join('\n')}>{hist.length} preços</span> : null}</td>
                  <td className="text-right">{a != null ? `${a} m²` : '—'}</td>
                  <td className="text-right">{p != null && a ? fmtBRL(p / a) : '—'}</td>
                  <td className="whitespace-nowrap text-xs">{dt(it.lastSeenAt)}</td>
                  <td className="text-right">{it._count.samples}</td>
                  <td className="text-right">{admin && <button type="button" onClick={() => void remove(it.id)} aria-label="Tirar do banco" className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}</td>
                </tr>
              )
            })}</tbody>
          </table>
        )}
        {d.pages > 1 && <div className="mt-3 flex items-center justify-center gap-3 text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40">Anterior</button><span>{d.page} de {d.pages}</span><button type="button" disabled={page >= d.pages} onClick={() => setPage(p => p + 1)} className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40">Próxima</button></div>}
      </div>
    </div>
  )
}

// ─── Buscas ───────────────────────────────────────────────────────────────────

function Buscas() {
  const [runs, setRuns] = useState<Run[] | null>(null)
  useEffect(() => { fetch('/api/admin/inteligencia/buscas').then(r => (r.ok ? r.json() : { runs: [] })).then(d => setRuns(d.runs)) }, [])
  if (!runs) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#2563eb]" /></div>
  return (
    <div className={`${card} overflow-x-auto`}>
      <p className="mb-3 text-sm text-gray-600">Registro de cada busca de amostras: onde se procurou, quantos anúncios apareceram e quantos viraram candidatas.</p>
      {runs.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">Nenhuma busca registrada ainda.</p> : (
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="py-2">Quando</th><th>Estudo</th><th>Onde</th><th>Quadra</th><th>Consulta</th><th className="text-right">Achou</th><th className="text-right">Leu</th><th className="text-right">Registrou</th><th>Por</th></tr></thead>
          <tbody>{runs.map(r => (
            <tr key={r.id} className="border-t border-gray-100 align-top"><td className="py-1.5 whitespace-nowrap text-xs">{dt(r.createdAt)}</td><td><Link href={`/admin/estudos/${r.study.id}`} className="text-[#2563eb] hover:underline">{r.study.title}</Link></td><td>{r.portal ?? '—'}</td><td className="whitespace-nowrap">{r.quadra ?? '—'}</td><td className="max-w-[200px] text-xs text-gray-600">{r.query ?? '—'}</td><td className="text-right">{r.found}</td><td className="text-right">{r.read}</td><td className="text-right">{r.registered}</td><td className="text-xs text-gray-500">{r.source === 'MCP' ? 'Claude' : 'Painel'}</td></tr>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}

// ─── Regiões ──────────────────────────────────────────────────────────────────

function Regioes({ admin }: { admin: boolean }) {
  const [rows, setRows] = useState<Region[] | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  useEffect(() => { fetch('/api/admin/inteligencia/regioes').then(r => (r.ok ? r.json() : { regions: [] })).then(d => setRows(d.regions)) }, [])
  async function save(r: Region) {
    const res = await fetch('/api/admin/inteligencia/regioes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id, confirmed: r.confirmed, market: r.market }) })
    if (res.ok) { setSaved(r.id); setTimeout(() => setSaved(null), 1500) }
  }
  const upd = (id: string, k: 'confirmed' | 'market', v: string) => setRows(a => (a ?? []).map(x => (x.id === id ? { ...x, [k]: v } : x)))
  if (!rows) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#2563eb]" /></div>
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /><p>Uso interno. Estas observações orientam a pesquisa (o Claude lê antes de procurar amostras) e <b>não aparecem em relatório para cliente</b>. Os valores de mercado vieram de uma pesquisa feita em setembro de 2026 e envelhecem: corrija quando souber de algo mais atual.</p></div>
      {rows.map(r => (
        <div key={r.id} className={card}>
          <h2 className="font-semibold text-[#1e3a8a]">{r.name} <span className="text-xs font-normal text-gray-500">· {r.city}</span></h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`c-${r.id}`}>O que se sabe da região</label><textarea id={`c-${r.id}`} rows={4} value={r.confirmed ?? ''} onChange={e => upd(r.id, 'confirmed', e.target.value)} readOnly={!admin} className={inputCls} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`m-${r.id}`}>Mercado (referências de preço)</label><textarea id={`m-${r.id}`} rows={4} value={r.market ?? ''} onChange={e => upd(r.id, 'market', e.target.value)} readOnly={!admin} className={inputCls} /></div>
          </div>
          {admin && <button type="button" onClick={() => void save(r)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">{saved === r.id ? <><Check className="h-4 w-4" /> Salvo</> : 'Salvar'}</button>}
        </div>
      ))}
    </div>
  )
}

// ─── Conector do Claude ───────────────────────────────────────────────────────

function Conector() {
  const [tokens, setTokens] = useState<Token[] | null>(null)
  const [name, setName] = useState('Claude')
  const [fresh, setFresh] = useState<{ connectorUrl: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const load = useCallback(async () => { const res = await fetch('/api/admin/inteligencia/tokens'); if (res.ok) setTokens((await res.json()).tokens) }, [])
  useEffect(() => { void load() }, [load])

  async function create() {
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/admin/inteligencia/tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(d.error ?? 'Não foi possível gerar.'); return }
      setFresh({ connectorUrl: d.connectorUrl }); await load()
    } finally { setBusy(false) }
  }
  async function revoke(id: string) {
    if (!window.confirm('Revogar este endereço? O Claude para de acessar o site por ele na hora.')) return
    await fetch(`/api/admin/inteligencia/tokens?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); await load()
  }

  return (
    <div className="space-y-4" data-testid="conector">
      <div className={card}>
        <h2 className="font-semibold text-[#1e3a8a]">Ligar o Claude ao site</h2>
        <p className="mt-1 text-sm text-gray-600">O conector deixa o Claude ler os estudos, consultar a base de quadras, registrar as amostras que encontrar nos portais e criar rascunhos de anúncio. Ele <b>não aprova amostra, não publica e não apaga nada</b>: isso continua com você, aqui no painel.</p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-gray-700">
          <li>Clique em <b>Gerar endereço do conector</b> e copie o endereço que aparece (ele é mostrado uma única vez).</li>
          <li>No Claude, abra <b>Personalizar → Conectores → Adicionar conector personalizado</b>.</li>
          <li>Dê o nome <b>Corretor Paulo Pop</b>, cole o endereço e confirme.</li>
          <li>No estudo, aba <b>Pesquisa</b>, clique em <b>Pedir pesquisa ao Claude</b> e cole o pedido na conversa.</li>
        </ol>
        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <input value={name} onChange={e => setName(e.target.value)} className={`${inputCls} md:w-64`} aria-label="Nome para identificar" placeholder="Nome (ex.: Claude do Paulo)" />
          <button type="button" onClick={create} disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-medium text-white hover:bg-[#c2410c] disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Gerar endereço do conector</button>
        </div>
        {err && <p className="mt-2 text-sm text-red-700" role="alert">{err}</p>}
        {fresh && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900">Endereço gerado. Copie agora: ele não será mostrado de novo.</p>
            <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
              <code className="flex-1 break-all rounded bg-white px-2 py-1.5 text-xs" data-testid="connector-url">{fresh.connectorUrl}</code>
              <button type="button" onClick={async () => { await navigator.clipboard.writeText(fresh.connectorUrl); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="inline-flex items-center justify-center gap-1 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copiado' : 'Copiar'}</button>
            </div>
            <p className="mt-2 text-xs text-green-900">Trate este endereço como uma senha: quem tiver o endereço acessa os seus estudos pelo conector. Não envie por WhatsApp nem e-mail. Se vazar, revogue abaixo e gere outro.</p>
          </div>
        )}
      </div>
      <div className={`${card} overflow-x-auto`}>
        <h2 className="font-semibold text-[#1e3a8a]">Endereços gerados</h2>
        {!tokens ? <Loader2 className="mt-3 h-5 w-5 animate-spin text-[#2563eb]" /> : tokens.length === 0 ? <p className="mt-2 text-sm text-gray-400">Nenhum ainda.</p> : (
          <table className="mt-3 w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="py-2">Nome</th><th>Começa com</th><th>De</th><th>Criado</th><th>Último uso</th><th>Situação</th><th></th></tr></thead>
            <tbody>{tokens.map(t => (
              <tr key={t.id} className="border-t border-gray-100"><td className="py-1.5">{t.name}</td><td><code className="text-xs">{t.prefix}…</code></td><td className="text-xs">{t.user.name}</td><td className="text-xs">{dt(t.createdAt)}</td><td className="text-xs">{dt(t.lastUsedAt)}</td><td>{t.revokedAt ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">revogado</span> : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">ativo</span>}</td><td className="text-right">{!t.revokedAt && <button type="button" onClick={() => void revoke(t.id)} className="text-xs font-medium text-red-600 hover:underline">revogar</button>}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <div className={card}>
        <h2 className="font-semibold text-[#1e3a8a]">O que o Claude consegue fazer pelo conector</h2>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm text-gray-700 md:grid-cols-2">
          {[['listar_estudos', 'vê os estudos que pedem pesquisa'], ['ler_estudo', 'lê o imóvel, os filtros e as amostras'], ['buscar_no_site', 'passo 1: procura no seu site e no banco de amostras'], ['proxima_quadra', 'diz a quadra e os portais da vez'], ['consultar_quadras', 'consulta a base de endereços'], ['registrar_candidatas', 'registra anúncios lidos como candidatas'], ['registrar_busca', 'anota onde procurou'], ['recusar_amostra', 'recusa uma amostra quando você mandar'], ['resumo_calculo', 'mostra o cálculo atual'], ['importar_anuncio', 'cria rascunho de anúncio (sem publicar)']].map(([n, d]) => <li key={n}><code className="text-xs text-[#1e3a8a]">{n}</code> — {d}</li>)}
        </ul>
      </div>
    </div>
  )
}
