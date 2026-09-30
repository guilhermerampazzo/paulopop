'use client'

/**
 * v1.4 — Aba "Pesquisa" do estudo de mercado.
 * O corretor define a meta e os parâmetros, roda a busca no próprio site, pede a pesquisa ao Claude
 * (pelo conector) e decide sobre cada candidata: aprovar (entra no cálculo) ou recusar com o motivo
 * (a busca é reaberta para completar a meta).
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Search, Check, X, RotateCcw, Copy, ExternalLink, Bot, RefreshCw, ChevronDown, AlertTriangle } from 'lucide-react'
import { fmtBRL } from '@/lib/market-study'

type ApiSample = Record<string, unknown> & { id: string }
interface Run { id: string; source: string; step: string | null; quadra: string | null; portal: string | null; query: string | null; found: number; read: number; registered: number; notes: string | null; createdAt: string }
interface View {
  status: string; target: number; counts: { approved: number; candidates: number; rejected: number; have: number }
  params: { quadra: string | null; condo: string | null; portals: string[]; otherPortals: string[]; areaTolPct: number | null; bedroomsTol: number | null; maxAdDays: number | null; rules: string | null }
  base: string | null; baseDetected: boolean; intelCity: string | null; condo: string | null; quadraOptions: string[]
  next: { done: boolean; reason: string | null; label: string | null; kind: string | null; quadra: string | null; terms: string[]; portals: string[]; missing: number; position: { atual: number; total: number }; tier: number }
  plan: Array<{ label: string; kind: string; passo: number; current: boolean; done: boolean }>; planTotal: number
  candidates: ApiSample[]; rejected: ApiSample[]; runs: Run[]; prompt: string; connectorReady: boolean; message?: string | null
}

const PRIORITY = ['WImóveis', 'DF Imóveis', 'OLX']
const OTHERS = ['VivaReal', 'ZAP', 'Imovelweb', 'Chaves na Mão']
const STATUS: Record<string, { text: string; cls: string }> = {
  NONE: { text: 'Sem pedido de pesquisa', cls: 'bg-gray-100 text-gray-600' },
  REQUESTED: { text: 'Pesquisa pedida', cls: 'bg-amber-100 text-amber-800' },
  RUNNING: { text: 'Pesquisa em andamento', cls: 'bg-blue-100 text-blue-800' },
  DONE: { text: 'Pesquisa concluída', cls: 'bg-green-100 text-green-800' },
}
const ORIGIN: Record<string, string> = { CLAUDE: 'Claude (conector)', SITE: 'Meu site / banco de amostras', LINK: 'Link colado', MANUAL: 'À mão' }
const QUICK_REASONS = ['Área muito diferente', 'Outro padrão de acabamento', 'Anúncio repetido', 'Anúncio antigo ou fora do ar', 'Não é da região', 'Preço fora da realidade']
const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))
const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]'

export function StudyResearchTab({ studyId, onApproved, onCounts }: { studyId: string; onApproved: (samples: ApiSample[]) => void; onCounts?: (c: View['counts']) => void }) {
  const [v, setV] = useState<View | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [form, setForm] = useState({ target: '10', quadra: '', condo: '', areaTolPct: '30', bedroomsTol: '1', maxAdDays: '180', rules: '', portals: PRIORITY, otherPortals: OTHERS })
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPlan, setShowPlan] = useState(false)
  const [showRejected, setShowRejected] = useState(false)

  const apply = useCallback((d: View) => {
    setV(d)
    onCounts?.(d.counts)
    setForm({
      target: String(d.target), quadra: d.baseDetected ? '' : d.params.quadra ?? '', condo: d.params.condo ?? '', areaTolPct: String(d.params.areaTolPct ?? 30), bedroomsTol: String(d.params.bedroomsTol ?? 1),
      maxAdDays: String(d.params.maxAdDays ?? 180), rules: d.params.rules ?? '', portals: d.params.portals, otherPortals: d.params.otherPortals,
    })
  }, [onCounts])

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/estudos/${studyId}/pesquisa`)
    if (res.ok) apply(await res.json())
  }, [studyId, apply])
  useEffect(() => { void load() }, [load])

  async function call(key: string, method: 'PUT' | 'POST', body: Record<string, unknown>, okText?: string) {
    setBusy(key); setMsg(null)
    try {
      const res = await fetch(`/api/admin/estudos/${studyId}/pesquisa`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Não foi possível concluir.' }); return false }
      apply(d)
      setMsg({ type: 'ok', text: d.message ?? okText ?? 'Salvo.' })
      return true
    } catch { setMsg({ type: 'err', text: 'Sem conexão com o servidor.' }); return false } finally { setBusy(null) }
  }
  const paramsBody = () => ({
    targetSamples: Number(form.target) || 10,
    searchParams: { quadra: form.quadra || null, condo: form.condo || null, portals: form.portals, otherPortals: form.otherPortals, areaTolPct: num(form.areaTolPct), bedroomsTol: num(form.bedroomsTol), maxAdDays: num(form.maxAdDays), rules: form.rules || null },
  })

  async function decide(action: 'approve' | 'reject' | 'restore', ids: string[], reason?: string) {
    setBusy(`${action}:${ids[0]}`); setMsg(null)
    try {
      const res = await fetch(`/api/admin/estudos/${studyId}/candidatas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, sampleIds: ids, reason }) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Não foi possível concluir.' }); return }
      if (action === 'approve') onApproved(d.samples ?? [])
      setRejecting(null)
      setMsg({ type: 'ok', text: action === 'approve' ? `${ids.length} amostra(s) aprovada(s): já contam no cálculo.` : action === 'reject' ? 'Amostra recusada. A busca foi reaberta para completar a meta.' : 'A amostra voltou para a lista de candidatas.' })
      await load()
    } finally { setBusy(null) }
  }

  if (!v) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#2563eb]" /></div>
  const st = STATUS[v.status] ?? STATUS.NONE
  // marca/desmarca mantendo a ordem de prioridade
  const toggle = (list: 'portals' | 'otherPortals', name: string) => setForm(f => ({ ...f, [list]: (list === 'portals' ? PRIORITY : OTHERS).filter(p => (p === name ? !f[list].includes(p) : f[list].includes(p))) }))

  return (
    <div className="space-y-4" data-testid="aba-pesquisa">
      {msg && <div role="alert" className={`rounded-lg px-4 py-2 text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}

      {/* Situação */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[#1e3a8a]">Pesquisa de amostras</h2>
            <p className="mt-1 text-sm text-gray-600"><strong>{v.counts.approved}</strong> aprovada(s) · <strong>{v.counts.candidates}</strong> candidata(s) aguardando você · <strong>{v.counts.rejected}</strong> recusada(s) · meta <strong>{v.target}</strong></p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}>{st.text}</span>
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"><RefreshCw className="h-3.5 w-3.5" /> Atualizar</button>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-[#F0F4F8] p-4 text-sm">
          {v.next.done ? (
            <p className="font-medium text-[#1e3a8a]">{v.next.reason === 'META_ATINGIDA' ? 'Meta atingida: confira as candidatas abaixo. Se recusar alguma, a busca continua de onde parou.' : `A ordem de busca acabou e ainda faltam ${v.next.missing} amostra(s). Aumente a tolerância, inclua outros portais ou recomece a ordem.`}</p>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Próximo passo · {v.next.position.atual} de {v.next.position.total}{v.next.tier === 1 ? ' · demais portais' : ''} · faltam {v.next.missing}</p>
              <p className="mt-1 font-medium text-[#1e3a8a]">{v.next.label}</p>
              <p className="mt-1 text-xs text-gray-600">Onde: {v.next.portals.join(', ')}{v.next.terms.length ? ` · termos: ${v.next.terms.join(' | ')}` : ''}</p>
            </>
          )}
          <button type="button" onClick={() => setShowPlan(s => !s)} className="mt-2 inline-flex items-center gap-1 text-xs text-[#2563eb] hover:underline"><ChevronDown className={`h-3.5 w-3.5 transition ${showPlan ? 'rotate-180' : ''}`} /> Ver a ordem de busca ({v.planTotal} passos)</button>
          {showPlan && (
            <ol className="mt-2 max-h-64 space-y-0.5 overflow-y-auto rounded-lg bg-white p-3 text-xs">
              {v.plan.map((p, i) => <li key={i} className={p.current ? 'font-semibold text-[#ea580c]' : p.done ? 'text-gray-400 line-through' : 'text-gray-700'}>{i + 1}. {p.label}</li>)}
              {v.planTotal > v.plan.length && <li className="text-gray-400">… e mais {v.planTotal - v.plan.length} passos</li>}
            </ol>
          )}
          {!v.intelCity && <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> Não há base de quadras para a cidade deste imóvel (a base atual é de Samambaia). A busca vai por condomínio, bairro e cidade.</p>}
          {v.intelCity && !v.base && <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> Não identifiquei a quadra no endereço do imóvel. Escolha a quadra abaixo para a busca seguir quadra a quadra.</p>}
        </div>
      </div>

      {/* Parâmetros */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-[#1e3a8a]">Parâmetros da pesquisa</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="pq-target">Meta de amostras</label><input id="pq-target" type="number" min={3} max={30} value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} className={inputCls} /></div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="pq-quadra">Quadra do imóvel</label>
            <select id="pq-quadra" value={form.quadra} onChange={e => setForm(f => ({ ...f, quadra: e.target.value }))} className={inputCls} disabled={!v.quadraOptions.length}>
              <option value="">{v.baseDetected && v.base ? `Pelo endereço: ${v.base}` : 'Detectar pelo endereço'}</option>
              {v.quadraOptions.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div className="md:col-span-2"><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="pq-condo">Condomínio / prédio (busca primeiro nele)</label><input id="pq-condo" value={form.condo} onChange={e => setForm(f => ({ ...f, condo: e.target.value }))} className={inputCls} placeholder={v.condo ?? 'Ex.: Residencial Parque Riacho 21'} /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="pq-area">Tolerância de área (± %)</label><input id="pq-area" type="number" min={5} max={100} value={form.areaTolPct} onChange={e => setForm(f => ({ ...f, areaTolPct: e.target.value }))} className={inputCls} /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="pq-bed">Tolerância de quartos (±)</label><input id="pq-bed" type="number" min={0} max={3} value={form.bedroomsTol} onChange={e => setForm(f => ({ ...f, bedroomsTol: e.target.value }))} className={inputCls} /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="pq-days">Anúncio com até (dias)</label><input id="pq-days" type="number" min={15} max={730} value={form.maxAdDays} onChange={e => setForm(f => ({ ...f, maxAdDays: e.target.value }))} className={inputCls} /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <fieldset><legend className="mb-1 text-xs font-medium text-gray-600">Portais prioritários (pesquisados primeiro)</legend>
            <div className="flex flex-wrap gap-3 text-sm">{PRIORITY.map(p => <label key={p} className="flex items-center gap-1.5"><input type="checkbox" checked={form.portals.includes(p)} onChange={() => toggle('portals', p)} /> {p}</label>)}</div>
          </fieldset>
          <fieldset><legend className="mb-1 text-xs font-medium text-gray-600">Outros portais (só se faltar amostra)</legend>
            <div className="flex flex-wrap gap-3 text-sm">{OTHERS.map(p => <label key={p} className="flex items-center gap-1.5"><input type="checkbox" checked={form.otherPortals.includes(p)} onChange={() => toggle('otherPortals', p)} /> {p}</label>)}</div>
          </fieldset>
        </div>
        <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="pq-rules">Minhas regras para esta pesquisa</label><textarea id="pq-rules" rows={2} value={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.value }))} className={inputCls} placeholder="Ex.: só apartamentos com elevador; não usar anúncios de leilão; preferir andar alto" /></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!!busy} onClick={() => void call('save', 'PUT', paramsBody(), 'Parâmetros salvos.')} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#172554] disabled:opacity-50">{busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" />} Salvar parâmetros</button>
          <button type="button" disabled={!!busy} onClick={async () => { if (await call('save', 'PUT', paramsBody())) await call('site', 'POST', { action: 'site' }) }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy === 'site' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} 1. Buscar no meu site</button>
          <button type="button" disabled={!!busy} onClick={() => void call('request', 'PUT', { ...paramsBody(), request: true }, 'Pesquisa pedida. Copie o pedido abaixo e cole no Claude.')} className="inline-flex items-center gap-1.5 rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-medium text-white hover:bg-[#c2410c] disabled:opacity-50"><Bot className="h-4 w-4" /> 2. Pedir pesquisa ao Claude</button>
          <button type="button" disabled={!!busy} onClick={() => { if (window.confirm('Recomeçar a ordem de busca do primeiro passo? As amostras que já estão no estudo continuam.')) void call('restart', 'POST', { action: 'restart' }) }} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Recomeçar a ordem</button>
        </div>
        <div className="rounded-xl border border-dashed border-gray-300 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-700">Pedido para colar no Claude</p>
            <button type="button" onClick={async () => { await navigator.clipboard.writeText(v.prompt); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copiado' : 'Copiar pedido'}</button>
          </div>
          <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700">{v.prompt}</pre>
          {!v.connectorReady && <p className="mt-2 text-xs text-amber-700">O conector ainda não foi ligado ao Claude. <Link href="/admin/inteligencia?aba=conector" className="font-medium underline">Gerar o endereço do conector</Link>.</p>}
        </div>
      </div>

      {/* Candidatas */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-[#1e3a8a]">Candidatas ({v.candidates.length})</h2>
          {v.candidates.length > 1 && <button type="button" disabled={!!busy} onClick={() => { if (window.confirm(`Aprovar as ${v.candidates.length} candidatas de uma vez?`)) void decide('approve', v.candidates.map(c => c.id)) }} className="rounded-lg border border-green-600 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50">Aprovar todas</button>}
        </div>
        <p className="mt-1 text-xs text-gray-500">Candidata não entra no cálculo. Abra o anúncio, confira e decida. Recusar reabre a busca para completar a meta.</p>
        {v.candidates.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">Nenhuma candidata no momento. Use “Buscar no meu site” ou peça a pesquisa ao Claude.</p>}
        <div className="mt-3 space-y-3">
          {v.candidates.map(c => {
            const price = num(c.price), area = num(c.areaPrivate)
            const tags = Array.isArray(c.tags) ? (c.tags as string[]) : []
            const alt = Array.isArray(c.altUrls) ? (c.altUrls as string[]) : []
            const photo = typeof c.photoUrl === 'string' && c.photoUrl ? c.photoUrl : null
            return (
              <div key={c.id} className="rounded-xl border border-gray-200 p-4" data-testid="candidata">
                <div className="flex flex-col gap-3 md:flex-row">
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" referrerPolicy="no-referrer" className="h-24 w-full flex-shrink-0 rounded-lg bg-gray-100 object-cover md:w-32" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{String(c.location ?? c.portal ?? 'Anúncio')}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{String(c.portal ?? '')}{c.foundAtQuadra ? ` · ${String(c.foundAtQuadra)}` : ''} · {ORIGIN[String(c.origin)] ?? String(c.origin)}{c.advertiser ? ` · ${String(c.advertiser)}` : ''}</p>
                    <p className="mt-1.5 text-sm text-gray-800">
                      <strong>{price != null ? fmtBRL(price, 0) : 'sem preço'}</strong> · {area != null ? `${area} m²` : 'sem área'}{price != null && area ? <> · <strong className="text-[#1e3a8a]">{fmtBRL(price / area)}/m²</strong></> : null}
                      {c.bedrooms != null ? ` · ${String(c.bedrooms)} qto(s)` : ''}{c.parking != null ? ` · ${String(c.parking)} vaga(s)` : ''}{c.floor ? ` · andar ${String(c.floor)}` : ''}{c.daysListed != null ? ` · há ${String(c.daysListed)} dias` : ''}
                    </p>
                    {(tags.length > 0 || c.sameCondo === true) && (
                      <p className="mt-1.5 flex flex-wrap gap-1">
                        {c.sameCondo === true && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">mesmo condomínio</span>}
                        {tags.map(t => <span key={t} className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{t}</span>)}
                      </p>
                    )}
                    <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      {typeof c.url === 'string' && c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#2563eb] hover:underline"><ExternalLink className="h-3 w-3" /> Abrir anúncio</a>}
                      {alt.map((u, i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#2563eb] hover:underline"><ExternalLink className="h-3 w-3" /> Mesmo imóvel em outro portal {alt.length > 1 ? i + 1 : ''}</a>)}
                    </p>
                    {(typeof c.sourceText === 'string' && c.sourceText) || (typeof c.notes === 'string' && c.notes) ? (
                      <details className="mt-1.5 text-xs text-gray-600"><summary className="cursor-pointer text-gray-500">Trecho do anúncio e observações</summary>
                        {typeof c.sourceText === 'string' && c.sourceText && <p className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2">{c.sourceText}</p>}
                        {typeof c.notes === 'string' && c.notes && <p className="mt-1">{c.notes}</p>}
                      </details>
                    ) : null}
                  </div>
                  <div className="flex flex-shrink-0 gap-2 md:flex-col">
                    <button type="button" disabled={!!busy} onClick={() => void decide('approve', [c.id])} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Aprovar</button>
                    <button type="button" disabled={!!busy} onClick={() => setRejecting({ id: c.id, reason: '' })} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Não serve</button>
                  </div>
                </div>
                {rejecting?.id === c.id && (
                  <div className="mt-3 rounded-lg bg-red-50 p-3">
                    <label className="mb-1 block text-xs font-medium text-red-800" htmlFor={`rej-${c.id}`}>Por que não serve? (o motivo orienta a próxima busca)</label>
                    <div className="mb-2 flex flex-wrap gap-1">{QUICK_REASONS.map(r => <button key={r} type="button" onClick={() => setRejecting({ id: c.id, reason: r })} className="rounded-full border border-red-200 bg-white px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-100">{r}</button>)}</div>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <input id={`rej-${c.id}`} value={rejecting.reason} onChange={e => setRejecting({ id: c.id, reason: e.target.value })} className={inputCls} placeholder="Motivo" />
                      <button type="button" disabled={!!busy || !rejecting.reason.trim()} onClick={() => void decide('reject', [c.id], rejecting.reason)} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">Recusar</button>
                      <button type="button" onClick={() => setRejecting(null)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs">Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recusadas */}
      {v.rejected.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <button type="button" onClick={() => setShowRejected(s => !s)} className="flex w-full items-center justify-between text-left font-semibold text-[#1e3a8a]">Recusadas ({v.rejected.length}) <ChevronDown className={`h-4 w-4 transition ${showRejected ? 'rotate-180' : ''}`} /></button>
          {showRejected && (
            <ul className="mt-3 divide-y divide-gray-100 text-sm">
              {v.rejected.map(r => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0"><p className="truncate text-gray-800">{String(r.location ?? r.url ?? 'Anúncio')}</p><p className="text-xs text-gray-500">{String(r.portal ?? '')} · motivo: {String(r.rejectedReason ?? r.discardReason ?? '—')}</p></div>
                  <div className="flex items-center gap-2">
                    {typeof r.url === 'string' && r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2563eb] hover:underline">abrir</a>}
                    <button type="button" disabled={!!busy} onClick={() => void decide('restore', [r.id])} className="rounded-lg border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50">Voltar a candidata</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Histórico */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1e3a8a]">Onde já se procurou ({v.runs.length})</h2>
        {v.runs.length === 0 ? <p className="mt-2 text-sm text-gray-400">Nenhuma busca registrada ainda.</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="py-2">Quando</th><th>Onde</th><th>Quadra</th><th>Consulta</th><th className="text-right">Achou</th><th className="text-right">Leu</th><th className="text-right">Registrou</th><th>Por</th></tr></thead>
              <tbody>{v.runs.map(r => (
                <tr key={r.id} className="border-t border-gray-100 align-top"><td className="py-1.5 whitespace-nowrap">{new Date(r.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td>{r.portal ?? '—'}</td><td>{r.quadra ?? '—'}</td><td className="max-w-[220px] text-xs text-gray-600">{r.query ?? '—'}{r.notes ? <span className="block text-gray-400">{r.notes}</span> : null}</td><td className="text-right">{r.found}</td><td className="text-right">{r.read}</td><td className="text-right">{r.registered}</td><td className="text-xs text-gray-500">{r.source === 'MCP' ? 'Claude' : 'Painel'}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
