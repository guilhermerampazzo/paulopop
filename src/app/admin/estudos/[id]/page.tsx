'use client'

/**
 * v1.2 — Editor do Estudo de Mercado: dados do estudo, imóvel avaliado, amostras (à mão ou por link),
 * cálculo ao vivo (média, mediana, desvio, CV, valores competitivo/mercado/otimista) e publicação do link/PDF.
 * O corretor do estudo é o usuário logado.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Plus, Trash2, Link2, ExternalLink, Share2, Upload, Copy, Check, AlertTriangle, Calculator } from 'lucide-react'
import { computeStudy, fmtBRL, PORTALS, portalFromUrl, DEFAULT_INTRO, DEFAULT_METHODOLOGY } from '@/lib/market-study'
import { formatDuration } from '@/lib/sales'
import { StudyResearchTab } from '@/components/admin/StudyResearchTab'
import { BuscaAmostrasButton } from '@/components/admin/BuscaAmostrasButton'
import type { BuscaAmostrasResponse, MarketAnalysisRequest } from '@/lib/market-types'

type Sample = {
  id?: string; portal: string; url: string; advertiser: string; location: string; sameCondo: boolean
  price: string; areaPrivate: string; areaTotal: string; bedrooms: string; bathrooms: string; parking: string
  floor: string; sunPosition: string; renovation: string; condoFee: string; age: string; distanceKm: string
  publishedAt: string; daysListed: string; photoUrl: string; notes: string; status: 'VALID' | 'DISCARDED'; discardReason: string
  finishes: { piso?: string; forro?: string; pintura?: string }
  // v1.4
  suites?: string; origin?: string; tags?: string[]; altUrls?: string[]; sourceText?: string; foundAtQuadra?: string
}
type Study = Record<string, unknown> & { id: string; samples: Sample[]; agent: { name: string; creci: string | null }; property: { id: string; ref: string; slug: string } | null; publicToken: string | null; tokenExpiresAt: string | null; status: string }

const emptySample = (): Sample => ({ portal: 'DF Imóveis', url: '', advertiser: '', location: '', sameCondo: false, price: '', areaPrivate: '', areaTotal: '', bedrooms: '', bathrooms: '', parking: '', floor: '', sunPosition: '', renovation: '', condoFee: '', age: '', distanceKm: '', publishedAt: '', daysListed: '', photoUrl: '', notes: '', status: 'VALID', discardReason: '', finishes: {} })
const s = (v: unknown) => (v == null ? '' : String(v))
const TABS = [['estudo', 'Estudo'], ['imovel', 'Imóvel avaliado'], ['pesquisa', 'Pesquisa'], ['amostras', 'Amostras'], ['calculo', 'Cálculo e parecer'], ['publicar', 'Publicar / PDF']] as const
/** v1.4 — amostra do banco → campos do formulário (listas continuam listas; o resto vira texto). */
const toSample = (x: Record<string, unknown>): Sample => ({
  ...emptySample(),
  ...Object.fromEntries(Object.entries(x).map(([k, v]) => [k, k === 'finishes' ? (v ?? {}) : k === 'sameCondo' ? Boolean(v) : k === 'status' ? (v === 'DISCARDED' ? 'DISCARDED' : 'VALID') : k === 'publishedAt' && v ? String(v).slice(0, 10) : k === 'id' || Array.isArray(v) ? v : s(v)])),
}) as Sample

export default function EstudoEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('estudo')
  const [st, setSt] = useState<Record<string, string>>({})
  const [photos, setPhotos] = useState<string[]>([])
  const [finishes, setFinishes] = useState<Record<string, string>>({})
  const [samples, setSamples] = useState<Sample[]>([])
  const [meta, setMeta] = useState<{ agent: Study['agent']; property: Study['property']; publicToken: string | null; tokenExpiresAt: string | null; status: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [aiBusy, setAiBusy] = useState<string | null>(null)

  /** v1.3 — IA nas fotos (imóvel avaliado: key 'subject'; amostra: id da amostra salva) */
  async function analyzePhotos(target: 'subject' | string) {
    setAiBusy(target); setMsg(null)
    try {
      const url = target === 'subject' ? `/api/admin/estudos/${id}/analisar-fotos` : `/api/admin/estudos/${id}/amostras/${target}/analisar-fotos`
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const d = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Erro na análise' }); return }
      if (target === 'subject') setFinishes(f => ({ ...f, ...Object.fromEntries(Object.entries(d.finishes ?? {}).filter(([k, v]) => k !== 'ia' && typeof v === 'string')) as Record<string, string> }))
      else setSamples(list => list.map(x => x.id === target ? { ...x, finishes: { ...x.finishes, ...(d.finishes ?? {}) } } : x))
      setMsg({ type: 'ok', text: `IA: ${d.analysis?.resumo ?? 'análise concluída'} (confiança ${d.analysis?.confianca ?? '?'}%)` })
    } finally { setAiBusy(null) }
  }
  const [linkUrl, setLinkUrl] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  // v1.4 — amostras que esta tela carregou (o servidor só apaga as que saíram desta lista) e candidatas pendentes
  const knownIds = useRef<string[]>([])
  const [candCount, setCandCount] = useState(0)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const onCounts = useCallback((c: { candidates: number }) => setCandCount(c.candidates), [])
  const onApproved = useCallback((list: Array<Record<string, unknown>>) => {
    setSamples(a => [...a, ...list.filter(x => !a.some(y => y.id === x.id)).map(toSample)])
    knownIds.current = Array.from(new Set([...knownIds.current, ...list.map(x => String(x.id))]))
  }, [])
  /** v1.5 — portal da amostra IA para a lista fixa do formulário. */
  const MCP_PORTAL: Record<string, string> = { corretorpaulopop: 'Outro', wimoveis: 'WImóveis', dfimoveis: 'DF Imóveis', olx: 'OLX', outro: 'Outro' }
  /** v1.5 — amostras vindas da busca IA (Claude) → formato do editor. */
  const onMcpSamples = useCallback((r: BuscaAmostrasResponse) => {
    const mapped: Sample[] = r.amostras.map(x => ({
      ...emptySample(),
      portal: MCP_PORTAL[x.fonteFonte] ?? 'Outro',
      url: x.linkFonte ?? '',
      advertiser: x.fonteFonte === 'corretorpaulopop' ? 'corretorpaulopop.com' : x.title,
      location: [x.neighborhood, x.city].filter(Boolean).join(' – '),
      price: x.precoTotal ? String(x.precoTotal) : '',
      areaPrivate: x.metragem ? String(x.metragem) : '',
      bedrooms: x.quartos ? String(x.quartos) : '',
      bathrooms: x.banheiros ? String(x.banheiros) : '',
      photoUrl: x.fotos?.[0] ?? '',
      notes: `Amostra via busca IA (${x.fonteFonte})`,
    }))
    setSamples(a => [...a, ...mapped.filter(x => !x.url || !a.some(y => y.url === x.url))])
    setMsg({ type: 'ok', text: `${r.totalEncontradas} amostra(s) da busca IA adicionadas. Confira os campos e salve.` })
  }, [])
  /** v1.5 — dados do imóvel avaliado no formato que a busca IA espera. */
  const mcpPropertyData: MarketAnalysisRequest = {
    propertyType: st.propertyType ?? '',
    neighborhood: st.neighborhood ?? '',
    city: st.city ?? '',
    metragem: Number(st.areaPrivate) || 0,
    quartos: Number(st.bedrooms) || 0,
    banheiros: Number(st.bathrooms) || 0,
    condicao: st.condition ?? '',
    amenidades: st.leisure ? [st.leisure] : [],
  }

  const hydrate = useCallback((d: Study) => {
    const fields: Record<string, string> = {}
    for (const k of ['title', 'preparedFor', 'ownerEmail', 'ownerPhone', 'radiusKm', 'intro', 'methodology', 'advertiser', 'address', 'neighborhood', 'city', 'state', 'zipCode', 'latitude', 'longitude', 'propertyType', 'purpose', 'transactionType', 'areaPrivate', 'areaTotal', 'bedrooms', 'suites', 'bathrooms', 'parking', 'parkingType', 'floor', 'buildingFloors', 'elevator', 'sunPosition', 'condition', 'renovation', 'renovationNotes', 'age', 'condoFee', 'iptu', 'leisure', 'demand', 'demandNotes', 'notes', 'competitivePct', 'optimisticPct', 'outlierPct', 'scenario', 'adjustPct', 'adjustNote']) {
      fields[k] = d[k] === true ? 'true' : d[k] === false ? 'false' : s(d[k])
    }
    fields.studyDate = d.studyDate ? String(d.studyDate).slice(0, 10) : new Date().toISOString().slice(0, 10)
    if (!fields.intro) fields.intro = DEFAULT_INTRO
    if (!fields.methodology) fields.methodology = DEFAULT_METHODOLOGY
    setSt(fields)
    setPhotos(Array.isArray(d.photos) ? (d.photos as string[]) : [])
    setFinishes((d.finishes as Record<string, string>) ?? {})
    // v1.4: a aba Amostras mostra só as aprovadas; candidatas e recusadas ficam na aba Pesquisa
    const all = (d.samples ?? []) as unknown as Array<Record<string, unknown>>
    const approved = all.filter(x => !x.candidateStatus || x.candidateStatus === 'APPROVED')
    setSamples(approved.map(toSample))
    knownIds.current = approved.map(x => String(x.id))
    setCandCount(all.filter(x => x.candidateStatus === 'CANDIDATE').length)
    setMeta({ agent: d.agent, property: d.property, publicToken: d.publicToken, tokenExpiresAt: d.tokenExpiresAt, status: d.status })
  }, [])

  useEffect(() => {
    fetch(`/api/admin/estudos/${id}`).then(r => r.json()).then(hydrate).finally(() => setLoading(false))
  }, [id, hydrate])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setSt(p => ({ ...p, [k]: e.target.value }))
  const setSample = (i: number, k: keyof Sample, v: unknown) => setSamples(a => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const num = (v: string) => (v === '' ? null : Number(v))

  // cálculo ao vivo (a mesma função do servidor)
  const live = useMemo(() => computeStudy(
    samples.map(x => ({ id: x.id, price: num(x.price), areaPrivate: num(x.areaPrivate), status: x.status, daysListed: num(x.daysListed), publishedAt: x.publishedAt || null })),
    { areaPrivate: num(st.areaPrivate ?? '') },
    { competitivePct: num(st.competitivePct ?? '') ?? 15, optimisticPct: num(st.optimisticPct ?? '') ?? 10, outlierPct: num(st.outlierPct ?? '') ?? 30, scenario: st.scenario, adjustPct: num(st.adjustPct ?? '') }
  ), [samples, st.areaPrivate, st.competitivePct, st.optimisticPct, st.outlierPct, st.scenario, st.adjustPct])

  async function save(): Promise<boolean> {
    setSaving(true); setMsg(null)
    try {
      const body: Record<string, unknown> = { ...st, photos, finishes, elevator: st.elevator === 'true' ? true : st.elevator === 'false' ? false : null, samples, knownSampleIds: knownIds.current }
      const res = await fetch(`/api/admin/estudos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'Erro ao salvar')
      hydrate(d)
      setMsg({ type: 'ok', text: 'Estudo salvo.' })
      return true
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao salvar' })
      return false
    } finally { setSaving(false) }
  }

  /** v1.2: lê o link do anúncio. v1.4: também lê o TEXTO colado do anúncio (quando o portal bloqueia o link). */
  async function addByLink(text?: string) {
    if (!linkUrl.trim() && !text?.trim()) return
    setLinkBusy(true); setMsg(null)
    try {
      const res = await fetch(`/api/admin/estudos/${id}/amostra-link`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: linkUrl.trim() || undefined, text: text?.trim() || undefined }) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (text) { setMsg({ type: 'err', text: d.error ?? 'Não foi possível ler o texto.' }); return }
        setSamples(a => [...a, { ...emptySample(), url: linkUrl.trim(), portal: portalFromUrl(linkUrl) }])
        setMsg({ type: 'err', text: `${d.error ?? 'Não foi possível ler o anúncio'} A amostra foi criada só com o link; preencha os campos.` })
      } else {
        const sm = d.sample
        setSamples(a => [...a, { ...emptySample(), ...Object.fromEntries(Object.entries(sm).map(([k, v]) => [k, v == null ? '' : typeof v === 'boolean' ? v : Array.isArray(v) ? v : String(v)])) } as Sample])
        setMsg({ type: 'ok', text: `Amostra lida${sm.portal ? ` do ${sm.portal}` : ''}: confira preço, área e quartos antes de salvar.` })
        setPasteText(''); setPasteOpen(false)
      }
      setLinkUrl('')
    } finally { setLinkBusy(false) }
  }

  async function publish(renew = false) {
    if (!(await save())) return
    const res = await fetch(`/api/admin/estudos/${id}/publicar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 60, renew }) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Erro ao publicar' }); return }
    setMeta(m => m ? { ...m, publicToken: d.publicToken, tokenExpiresAt: d.tokenExpiresAt, status: 'DONE' } : m)
    setMsg({ type: 'ok', text: 'Estudo concluído. Link gerado (válido por 60 dias).' })
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return
    const urls: string[] = []
    for (const f of Array.from(files).slice(0, 12)) {
      const fd = new FormData(); fd.append('file', f)
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      if (r.ok) { const j = await r.json(); urls.push(j.url) }
    }
    setPhotos(p => [...p, ...urls].slice(0, 20))
  }

  const publicUrl = meta?.publicToken ? `${window.location.origin}/estudo/${meta.publicToken}` : null
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]'
  const F = (label: string, k: string, extra: { type?: string; placeholder?: string; span?: number } = {}) => (
    <div className={extra.span ? `md:col-span-${extra.span}` : ''}>
      <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`f-${k}`}>{label}</label>
      <input id={`f-${k}`} type={extra.type ?? 'text'} value={st[k] ?? ''} onChange={set(k)} placeholder={extra.placeholder} className={inputCls} />
    </div>
  )
  const Sel = (label: string, k: string, opts: Array<[string, string]>) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`f-${k}`}>{label}</label>
      <select id={`f-${k}`} value={st[k] ?? ''} onChange={set(k)} className={inputCls}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </div>
  )

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" /></div>

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/admin/estudos')} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="text-xl font-bold text-[#1e3a8a]">{st.title || 'Estudo de mercado'}</h1>
            <p className="text-xs text-gray-400">Corretor: {meta?.agent.name}{meta?.agent.creci ? ` · CRECI ${meta.agent.creci}` : ''} · {meta?.status === 'DONE' ? 'Concluído' : 'Rascunho'}{meta?.property ? ` · imóvel ${meta.property.ref}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {publicUrl && <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><ExternalLink className="h-4 w-4" /> Ver relatório</a>}
          <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#172554] disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar</button>
        </div>
      </div>

      {msg && <div role="alert" className={`mb-4 rounded-lg px-4 py-2 text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}

      {/* Resumo do cálculo sempre visível */}
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-white p-3 text-center shadow-sm md:grid-cols-6">
        {[['Amostras válidas', String(live.nValid)], ['Média R$/m²', fmtBRL(live.mean)], ['CV', live.cv != null ? `${live.cv}%` : '—'], ['Competitivo', fmtBRL(live.values.competitive, 0)], ['Mercado', fmtBRL(live.values.market, 0)], ['Otimista', fmtBRL(live.values.optimistic, 0)]].map(([l, v]) => (
          <div key={l}><p className="text-[10px] uppercase tracking-wide text-gray-500">{l}</p><p className="text-sm font-bold text-[#1e3a8a]">{v}</p></div>
        ))}
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
        {TABS.map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${tab === k ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{l}{k === 'amostras' ? ` (${samples.length})` : ''}{k === 'pesquisa' && candCount > 0 ? <span className="ml-1.5 rounded-full bg-[#ea580c] px-1.5 py-0.5 text-[10px] font-bold text-white">{candCount}</span> : null}</button>)}
      </div>

      {tab === 'estudo' && (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {F('Imóvel (título do estudo)', 'title', { span: 2, placeholder: 'Apto 304 Bl. B – Residencial Parque Riacho 21, Riacho Fundo II/DF' })}
            {F('Data do estudo', 'studyDate', { type: 'date' })}
            {F('Preparado para', 'preparedFor', { placeholder: 'Nome do proprietário' })}
            {F('E-mail do proprietário', 'ownerEmail', { type: 'email' })}
            {F('WhatsApp do proprietário', 'ownerPhone')}
            {F('Raio da pesquisa (km)', 'radiusKm', { type: 'number', placeholder: '2' })}
          </div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="f-intro">Introdução (capa)</label><textarea id="f-intro" rows={3} value={st.intro ?? ''} onChange={set('intro')} className={inputCls} /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="f-met">Metodologia (uma etapa por linha: “Título: texto”)</label><textarea id="f-met" rows={6} value={st.methodology ?? ''} onChange={set('methodology')} className={inputCls} /></div>
        </div>
      )}

      {tab === 'imovel' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Identificação e endereço</h2>
            <div className="grid gap-4 md:grid-cols-4">
              {F('Anunciado por', 'advertiser', { span: 2, placeholder: 'Proprietária – Tatiane' })}
              {Sel('Transação', 'transactionType', [['SALE', 'Venda'], ['RENT', 'Locação']])}
              {Sel('Finalidade', 'purpose', [['', '—'], ['RESIDENTIAL', 'Residencial'], ['COMMERCIAL', 'Comercial']])}
              {F('Endereço (quadra, conjunto, lote, condomínio, bloco, apto)', 'address', { span: 4, placeholder: 'QC 5 Conjunto 6 Lote 2 – Residencial Parque Riacho 21, Apto 304, Bloco B' })}
              {F('Bairro / região', 'neighborhood')}
              {F('Cidade', 'city')}
              {F('UF', 'state')}
              {F('CEP', 'zipCode')}
              {F('Latitude', 'latitude', { placeholder: '-15.87' })}
              {F('Longitude', 'longitude', { placeholder: '-48.05' })}
              {F('Tipo de imóvel', 'propertyType', { placeholder: 'Apartamento' })}
              {F('Idade (anos)', 'age', { type: 'number' })}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Características</h2>
            <div className="grid gap-4 md:grid-cols-4">
              {F('Área privativa (m²) *', 'areaPrivate', { type: 'number' })}
              {F('Área total (m²)', 'areaTotal', { type: 'number' })}
              {F('Quartos', 'bedrooms', { type: 'number' })}
              {F('Suítes', 'suites', { type: 'number' })}
              {F('Banheiros', 'bathrooms', { type: 'number' })}
              {F('Vagas', 'parking', { type: 'number' })}
              {Sel('Tipo de vaga', 'parkingType', [['', '—'], ['coberta', 'Coberta'], ['descoberta', 'Descoberta'], ['demarcada', 'Demarcada'], ['rotativa', 'Rotativa']])}
              {F('Andar', 'floor', { placeholder: '3º – último' })}
              {F('Total de andares', 'buildingFloors', { type: 'number' })}
              {Sel('Elevador', 'elevator', [['', '—'], ['true', 'Sim'], ['false', 'Não']])}
              {Sel('Posição solar', 'sunPosition', [['', '—'], ['Nascente', 'Nascente'], ['Poente', 'Poente'], ['Norte', 'Norte'], ['Sul', 'Sul']])}
              {Sel('Conservação', 'condition', [['', '—'], ['Original / conservado', 'Original / conservado'], ['Bom', 'Bom'], ['Precisa de reparos', 'Precisa de reparos'], ['Reformado', 'Reformado']])}
              {Sel('Reforma', 'renovation', [['', '—'], ['nao', 'Não – original da construtora'], ['parcial', 'Parcial'], ['completa', 'Completa']])}
              {F('Detalhes da reforma', 'renovationNotes', { span: 3 })}
              {F('Condomínio (R$/mês)', 'condoFee', { type: 'number' })}
              {F('IPTU (R$)', 'iptu', { type: 'number' })}
              {F('Lazer', 'leisure', { span: 2, placeholder: '2 churrasqueiras, parquinho, bicicletário' })}
              {Sel('Demanda', 'demand', [['', '—'], ['alta', 'Maior'], ['media', 'Média'], ['baixa', 'Menor']])}
              {F('Por quê (demanda)', 'demandNotes', { span: 3, placeholder: 'último andar sem elevador' })}
            </div>
            <div className="flex items-center justify-between pt-2"><h3 className="text-sm font-semibold text-gray-700">Acabamentos (o que aparece nas fotos)</h3>
              <button type="button" onClick={() => analyzePhotos('subject')} disabled={aiBusy === 'subject' || !photos.length} title={photos.length ? 'Identifica piso, forro, pintura e estado geral pelas fotos' : 'Envie fotos primeiro'} className="rounded-lg border border-[#1e3a8a] px-3 py-1.5 text-xs font-medium text-[#1e3a8a] hover:bg-[#eff6ff] disabled:opacity-50">{aiBusy === 'subject' ? 'Analisando…' : '✨ Analisar fotos com IA'}</button></div>
            <div className="grid gap-4 md:grid-cols-5">
              {(['piso', 'forro', 'pintura', 'esquadrias', 'armarios'] as const).map(k => (
                <div key={k}><label className="mb-1 block text-xs font-medium capitalize text-gray-600" htmlFor={`fin-${k}`}>{k === 'armarios' ? 'Armários' : k}</label><input id={`fin-${k}`} value={finishes[k] ?? ''} onChange={e => setFinishes(f => ({ ...f, [k]: e.target.value }))} className={inputCls} placeholder={k === 'piso' ? 'Cerâmica' : k === 'forro' ? 'Laje aparente' : k === 'pintura' ? 'Boa' : ''} /></div>
              ))}
            </div>
            <div><label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="f-notes">Alguma observação no imóvel?</label><textarea id="f-notes" rows={3} value={st.notes ?? ''} onChange={set('notes')} className={inputCls} placeholder="Apartamento no 3º e último andar de condomínio sem elevador…" /></div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-[#1e3a8a]">Registro fotográfico ({photos.length})</h2>
              <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"><Upload className="h-4 w-4" /> Enviar fotos</button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => void uploadPhotos(e.target.files)} />
            </div>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
              {photos.map((p, i) => (
                <div key={p} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt="" className="h-24 w-full rounded object-cover" />
                  <button type="button" aria-label="Remover foto" onClick={() => setPhotos(a => a.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded bg-white/90 p-1 text-red-600 opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                  {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-[#1e3a8a] px-1.5 text-[10px] text-white">capa</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'pesquisa' && <StudyResearchTab studyId={id} onApproved={onApproved} onCounts={onCounts} />}

      {tab === 'amostras' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-[#1e3a8a]">Adicionar amostra</h2>
            <p className="text-xs text-gray-500">Cole o link do anúncio (DF Imóveis, WImóveis, OLX, VivaReal, ZAP…) para o site tentar ler preço, área, quartos e foto. Se o portal bloquear, a amostra é criada com o link e você preenche à mão.</p>
            <div className="mt-3 flex flex-col gap-2 md:flex-row">
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://www.dfimoveis.com.br/imovel/…" className={inputCls} aria-label="Link do anúncio" />
              <button type="button" onClick={() => void addByLink()} disabled={linkBusy || !linkUrl.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{linkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Ler anúncio</button>
              <button type="button" onClick={() => setSamples(a => [...a, emptySample()])} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"><Plus className="h-4 w-4" /> Amostra à mão</button>
            </div>
            {/* v1.4 — copiar e colar o anúncio */}
            <button type="button" onClick={() => setPasteOpen(o => !o)} className="mt-2 text-xs text-[#2563eb] hover:underline">{pasteOpen ? 'Fechar' : 'O portal bloqueou? Cole o texto do anúncio'}</button>
            {pasteOpen && (
              <div className="mt-2 space-y-2">
                <textarea rows={5} value={pasteText} onChange={e => setPasteText(e.target.value)} className={inputCls} placeholder="Abra o anúncio, selecione tudo (Ctrl+A), copie (Ctrl+C) e cole aqui (Ctrl+V). Se tiver o link, preencha também o campo acima." aria-label="Texto do anúncio" />
                <button type="button" onClick={() => void addByLink(pasteText)} disabled={linkBusy || pasteText.trim().length < 20} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{linkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Ler texto colado</button>
              </div>
            )}
            {/* v1.5 — busca IA no portfólio (Claude) */}
            <div className="mt-4 border-t border-gray-100 pt-3">
              <BuscaAmostrasButton propertyId={meta?.property?.id} propertyData={mcpPropertyData} onSamplesFound={onMcpSamples} />
            </div>
            {candCount > 0 && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Há {candCount} candidata(s) aguardando sua decisão na aba <button type="button" onClick={() => setTab('pesquisa')} className="font-semibold underline">Pesquisa</button>. Elas só entram aqui e no cálculo depois de aprovadas.</p>}
          </div>

          {samples.map((sm, i) => {
            const stat = live.samples[i]
            return (
              <div key={sm.id ?? `n${i}`} className={`rounded-2xl border bg-white p-5 space-y-3 ${sm.status === 'DISCARDED' ? 'border-gray-200 opacity-70' : 'border-gray-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-[#1e3a8a]">Amostra {i + 1} <span className="ml-2 text-xs font-normal text-gray-500">{stat?.pricePerSqm != null ? `${fmtBRL(stat.pricePerSqm)}/m²` : 'preencha preço e área'}{stat?.deviationPct != null ? ` · desvio ${stat.deviationPct > 0 ? '+' : ''}${stat.deviationPct}%` : ''}</span>
                    {stat?.outlier && sm.status === 'VALID' && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800"><AlertTriangle className="h-3 w-3" /> discrepante</span>}
                    {stat?.oldListing && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">anúncio antigo</span>}
                  </h3>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-gray-600"><input type="checkbox" checked={sm.sameCondo} onChange={e => setSample(i, 'sameCondo', e.target.checked)} /> mesmo condomínio</label>
                    <select value={sm.status} onChange={e => setSample(i, 'status', e.target.value as 'VALID' | 'DISCARDED')} className="rounded-lg border border-gray-300 px-2 py-1 text-xs"><option value="VALID">Válida</option><option value="DISCARDED">Descartada</option></select>
                    {i > 0 && <button type="button" onClick={() => setSamples(a => { const c = [...a]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c })} className="rounded p-1 text-xs text-gray-500 hover:bg-gray-100" aria-label="Mover para cima">↑</button>}
                    <button type="button" aria-label="Remover amostra" onClick={() => setSamples(a => a.filter((_, j) => j !== i))} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-6">
                  <div><label className="text-[11px] text-gray-500">Portal</label><select value={sm.portal} onChange={e => setSample(i, 'portal', e.target.value)} className={inputCls}>{PORTALS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                  <div className="md:col-span-3"><label className="text-[11px] text-gray-500">Link do anúncio</label><input value={sm.url} onChange={e => setSample(i, 'url', e.target.value)} className={inputCls} /></div>
                  <div className="md:col-span-2"><label className="text-[11px] text-gray-500">Anunciado por</label><input value={sm.advertiser} onChange={e => setSample(i, 'advertiser', e.target.value)} className={inputCls} placeholder="JDM Imobiliária – DF Imóveis" /></div>
                  <div className="md:col-span-3"><label className="text-[11px] text-gray-500">Local</label><input value={sm.location} onChange={e => setSample(i, 'location', e.target.value)} className={inputCls} placeholder="Parque Riacho 20 – QC 5 Conj. 6" /></div>
                  <div><label className="text-[11px] text-gray-500">Valor anunciado (R$)</label><input type="number" value={sm.price} onChange={e => setSample(i, 'price', e.target.value)} className={inputCls} /></div>
                  <div><label className="text-[11px] text-gray-500">Área privativa (m²)</label><input type="number" value={sm.areaPrivate} onChange={e => setSample(i, 'areaPrivate', e.target.value)} className={inputCls} /></div>
                  <div><label className="text-[11px] text-gray-500">Área total (m²)</label><input type="number" value={sm.areaTotal} onChange={e => setSample(i, 'areaTotal', e.target.value)} className={inputCls} /></div>
                  <div><label className="text-[11px] text-gray-500">Quartos</label><input type="number" value={sm.bedrooms} onChange={e => setSample(i, 'bedrooms', e.target.value)} className={inputCls} /></div>
                  <div><label className="text-[11px] text-gray-500">Banheiros</label><input type="number" value={sm.bathrooms} onChange={e => setSample(i, 'bathrooms', e.target.value)} className={inputCls} /></div>
                  <div><label className="text-[11px] text-gray-500">Vagas</label><input type="number" value={sm.parking} onChange={e => setSample(i, 'parking', e.target.value)} className={inputCls} /></div>
                  <div><label className="text-[11px] text-gray-500">Andar</label><input value={sm.floor} onChange={e => setSample(i, 'floor', e.target.value)} className={inputCls} placeholder="Térreo, frente" /></div>
                  <div><label className="text-[11px] text-gray-500">Posição</label><input value={sm.sunPosition} onChange={e => setSample(i, 'sunPosition', e.target.value)} className={inputCls} placeholder="Nascente" /></div>
                  <div><label className="text-[11px] text-gray-500">Reforma</label><input value={sm.renovation} onChange={e => setSample(i, 'renovation', e.target.value)} className={inputCls} placeholder="Piso em porcelanato" /></div>
                  <div><label className="text-[11px] text-gray-500">Condomínio (R$)</label><input type="number" value={sm.condoFee} onChange={e => setSample(i, 'condoFee', e.target.value)} className={inputCls} /></div>
                  <div><label className="text-[11px] text-gray-500">Idade (anos)</label><input type="number" value={sm.age} onChange={e => setSample(i, 'age', e.target.value)} className={inputCls} /></div>
                  <div><label className="text-[11px] text-gray-500">Distância (km)</label><input type="number" step="0.01" value={sm.distanceKm} onChange={e => setSample(i, 'distanceKm', e.target.value)} className={inputCls} placeholder="0 = mesmo condomínio" /></div>
                  <div><label className="text-[11px] text-gray-500">Publicado em</label><input type="date" value={sm.publishedAt} onChange={e => setSample(i, 'publishedAt', e.target.value)} className={inputCls} /></div>
                  <div><label className="text-[11px] text-gray-500">ou anunciado há (dias)</label><input type="number" value={sm.daysListed} onChange={e => setSample(i, 'daysListed', e.target.value)} className={inputCls} /></div>
                  <div className="md:col-span-2"><label className="text-[11px] text-gray-500">Foto (URL)</label><input value={sm.photoUrl} onChange={e => setSample(i, 'photoUrl', e.target.value)} className={inputCls} /></div>
                  <div className="md:col-span-2"><label className="text-[11px] text-gray-500">Acabamentos (piso / forro / pintura) {sm.id && <button type="button" onClick={() => analyzePhotos(sm.id as string)} disabled={aiBusy === sm.id || !sm.photoUrl} title={sm.photoUrl ? 'IA nas fotos (salve o estudo antes)' : 'Informe a foto (URL) e salve'} className="ml-2 text-[#2563eb] hover:underline disabled:opacity-50">{aiBusy === sm.id ? 'analisando…' : '✨ IA nas fotos'}</button>}</label><div className="grid grid-cols-3 gap-1">{(['piso', 'forro', 'pintura'] as const).map(k => <input key={k} value={sm.finishes?.[k] ?? ''} onChange={e => setSample(i, 'finishes', { ...sm.finishes, [k]: e.target.value })} className={inputCls} placeholder={k} />)}</div></div>
                  <div className="md:col-span-6"><label className="text-[11px] text-gray-500">Observação (aparece no relatório)</label><textarea rows={2} value={sm.notes} onChange={e => setSample(i, 'notes', e.target.value)} className={inputCls} /></div>
                  {sm.status === 'DISCARDED' && <div className="md:col-span-6"><label className="text-[11px] text-gray-500">Motivo do descarte</label><input value={sm.discardReason} onChange={e => setSample(i, 'discardReason', e.target.value)} className={inputCls} /></div>}
                </div>
              </div>
            )
          })}
          {samples.length === 0 && <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">Nenhuma amostra. Mínimo recomendado: 3 (ideal 5 a 10, quanto mais melhor).</p>}
        </div>
      )}

      {tab === 'calculo' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="flex items-center gap-2 font-semibold text-[#1e3a8a]"><Calculator className="h-4 w-4" /> Parâmetros</h2>
            <div className="grid gap-4 md:grid-cols-5">
              {F('Competitivo (−%)', 'competitivePct', { type: 'number', placeholder: '15' })}
              {F('Otimista (+%)', 'optimisticPct', { type: 'number', placeholder: '10' })}
              {F('Discrepante (±%)', 'outlierPct', { type: 'number', placeholder: '30' })}
              {Sel('Cenário em destaque', 'scenario', [['COMPETITIVE', 'Competitivo'], ['MARKET', 'Mercado'], ['OPTIMISTIC', 'Otimista']])}
              {F('Ajuste manual (%)', 'adjustPct', { type: 'number', placeholder: '−5 = último andar sem elevador' })}
              {F('Justificativa do ajuste', 'adjustNote', { span: 5 })}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {[['Amostras', `${live.nValid} de ${live.n}`], ['Média R$/m²', fmtBRL(live.mean)], ['Mediana R$/m²', fmtBRL(live.median)], ['Desvio padrão', fmtBRL(live.std)], ['Coef. variação', live.cv != null ? `${live.cv}%` : '—'], ['Amplitude', `${fmtBRL(live.min, 0)} – ${fmtBRL(live.max, 0)}`]].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-[#F0F4F8] p-3"><p className="text-[10px] uppercase tracking-wide text-gray-500">{l}</p><p className="text-base font-bold text-[#1e3a8a]">{v}</p></div>
              ))}
            </div>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="py-2">Amostra</th><th>Valor</th><th>R$/m²</th><th>Anunciado há</th><th>Desvio</th><th>Status</th></tr></thead>
              <tbody>{live.samples.map((r, i) => (
                <tr key={i} className="border-t border-gray-100"><td className="py-1.5">Amostra {r.index}{samples[i]?.location ? ` – ${samples[i].location}` : ''}</td><td>{fmtBRL(r.price, 0)}</td><td>{fmtBRL(r.pricePerSqm)}</td><td>{r.daysListed != null ? formatDuration(r.daysListed) : '—'}{r.oldListing ? ' ⚠' : ''}</td><td>{r.deviationPct != null ? `${r.deviationPct > 0 ? '+' : ''}${r.deviationPct}%` : '—'}</td><td>{!r.valid ? 'descartada' : r.outlier ? 'discrepante' : 'válida'}</td></tr>
              ))}</tbody>
            </table>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {[['Competitivo', live.values.competitive, live.perSqm.competitive], ['Mercado', live.values.market, live.perSqm.market], ['Otimista', live.values.optimistic, live.perSqm.optimistic]].map(([l, v, p]) => (
                <div key={l as string} className="rounded-xl bg-[#1e3a8a] p-4 text-white"><p className="text-[10px] uppercase tracking-wide opacity-80">{l as string}</p><p className="text-xl font-bold">{fmtBRL(v as number | null, 0)}</p><p className="text-xs opacity-80">{fmtBRL(p as number | null)}/m²</p></div>
              ))}
              <div className="rounded-xl bg-[#ea580c] p-4 text-white"><p className="text-[10px] uppercase tracking-wide opacity-80">Valor sugerido ({st.scenario === 'COMPETITIVE' ? 'competitivo' : st.scenario === 'OPTIMISTIC' ? 'otimista' : 'mercado'}{st.adjustPct ? ` ${Number(st.adjustPct) > 0 ? '+' : ''}${st.adjustPct}%` : ''})</p><p className="text-xl font-bold">{fmtBRL(live.suggested, 0)}</p></div>
            </div>
            {!st.areaPrivate && <p className="mt-3 text-sm text-amber-700">Informe a área privativa do imóvel avaliado (aba Imóvel avaliado) para calcular os valores.</p>}
          </div>
        </div>
      )}

      {tab === 'publicar' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-[#1e3a8a]">Relatório e link para o proprietário</h2>
          <p className="text-sm text-gray-600">Ao concluir, o estudo ganha um link com validade de 60 dias para enviar por WhatsApp ou e-mail. O relatório abre no padrão do estudo (lâminas 16:9) e o botão “Baixar PDF” gera o arquivo pelo navegador.</p>
          {live.nValid < 3 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Recomendado ter pelo menos 3 amostras válidas (você tem {live.nValid}).</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => publish(false)} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-medium text-white hover:bg-[#c2410c] disabled:opacity-50"><Share2 className="h-4 w-4" /> {meta?.status === 'DONE' ? 'Salvar e atualizar relatório' : 'Concluir e gerar link'}</button>
            {publicUrl && <button type="button" onClick={() => publish(true)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Gerar link novo (invalida o anterior)</button>}
          </div>
          {publicUrl && (
            <div className="space-y-2 rounded-xl bg-[#F0F4F8] p-4">
              <p className="text-xs text-gray-500">Link público{meta?.tokenExpiresAt ? ` · válido até ${new Date(meta.tokenExpiresAt).toLocaleDateString('pt-BR')}` : ''}</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="break-all rounded bg-white px-2 py-1 text-xs">{publicUrl}</code>
                <button type="button" onClick={async () => { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs">{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copiar</button>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs"><ExternalLink className="h-3 w-3" /> Abrir relatório</a>
                {st.ownerPhone && <a href={`https://wa.me/${st.ownerPhone.replace(/\D/g, '').replace(/^(?!55)(\d{10,11})$/, '55$1')}?text=${encodeURIComponent(`Olá ${st.preparedFor ?? ''}! Segue o estudo de mercado do seu imóvel: ${publicUrl}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white">Enviar no WhatsApp</a>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
