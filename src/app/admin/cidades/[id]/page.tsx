'use client'

import { AreaInsightPanel } from '@/components/admin/AreaInsightPanel'

/**
 * v1.3 — Painel › Cidades do DF › editor de uma cidade.
 * Abas: Dados (campos fixos), Seções (SectionEditor + rascunho com IA), SEO e Pré-visualizar.
 */
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, Loader2, Save, Sparkles, X } from 'lucide-react'
import { SectionEditor } from '@/components/admin/SectionEditor'
import { parseSections, type Section } from '@/lib/sections'
import { ImageUpload, TextArea, TextInput, Select, inputCls } from '@/components/admin/sections/shared'

interface CityForm {
  name: string; slug: string; tagline: string; summary: string; coverUrl: string; videoUrl: string; status: string; order: string
  raNumber: string; foundedAt: string; founderGovernor: string; population: string; populationSource: string; areaKm2: string; distanceKm: string
  latitude: string; longitude: string; matchNames: string[]
  seoTitle: string; seoDescription: string; ogImageUrl: string
}

const TABS = [
  { id: 'dados', label: 'Dados' },
  { id: 'secoes', label: 'Seções' },
  { id: 'seo', label: 'SEO' },
  { id: 'preview', label: 'Pré-visualizar' },
]

/** Uma seção "vazia" pode receber o rascunho da IA sem apagar trabalho do Paulo. */
function isEmptySection(s: Section): boolean {
  switch (s.type) {
    case 'text': return !s.html?.replace(/<[^>]+>/g, '').trim()
    case 'timeline': return !s.entries?.length
    case 'people': return !s.people?.length
    case 'stats': return !s.stats?.length
    case 'items': return !s.items?.length
    default: return false
  }
}

/** Mescla o rascunho: preenche seções vazias do mesmo tipo/âncora; o que sobrar entra no fim. */
function mergeDraft(current: Section[], draft: Section[]): Section[] {
  const next = current.slice()
  const leftovers: Section[] = []
  for (const d of draft) {
    let idx = next.findIndex(s => s.type === d.type && s.anchor && s.anchor === d.anchor && isEmptySection(s))
    if (idx < 0) idx = next.findIndex(s => s.type === d.type && isEmptySection(s))
    if (idx >= 0) {
      const target = next[idx]
      next[idx] = { ...d, id: target.id, title: target.title || d.title, anchor: target.anchor || d.anchor, visible: target.visible } as Section
    } else {
      leftovers.push(d)
    }
  }
  return [...next, ...leftovers]
}

function ChipsInput({ label, value, onChange, hint }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const parts = draft.split(/[,;]/).map(s => s.trim()).filter(Boolean)
    if (parts.length) onChange(Array.from(new Set([...value, ...parts])))
    setDraft('')
  }
  return (
    <div>
      <label htmlFor="chips-input" className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1 mb-2">
        {value.map(v => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-[#eff6ff] px-2.5 py-1 text-xs text-[#1e3a8a]">
            {v}<button type="button" aria-label={`Remover ${v}`} onClick={() => onChange(value.filter(x => x !== v))}><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input id="chips-input" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="Nome e Enter (ou vírgula)" className={inputCls} />
        <button type="button" onClick={add} className="border border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#eff6ff] rounded-lg px-3 py-2 text-sm">Adicionar</button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  )
}

export default function AdminCidadeEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState('dados')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [form, setForm] = useState<CityForm | null>(null)
  const [areaInsightId, setAreaInsightId] = useState<string | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [aiBusy, setAiBusy] = useState(false)
  const [aiWarning, setAiWarning] = useState('')

  useEffect(() => {
    fetch(`/api/admin/cidades/${id}`).then(async r => {
      if (!r.ok) { router.push('/admin/cidades'); return }
      const d = await r.json()
      setAreaInsightId(d.areaInsightId ?? null)
      setForm({
        name: d.name ?? '', slug: d.slug ?? '', tagline: d.tagline ?? '', summary: d.summary ?? '', coverUrl: d.coverUrl ?? '', videoUrl: d.videoUrl ?? '',
        status: d.status ?? 'DRAFT', order: String(d.order ?? 0), raNumber: d.raNumber ?? '', foundedAt: d.foundedAt ?? '', founderGovernor: d.founderGovernor ?? '',
        population: d.population ?? '', populationSource: d.populationSource ?? '', areaKm2: d.areaKm2 ?? '', distanceKm: d.distanceKm ?? '',
        latitude: d.latitude != null ? String(d.latitude) : '', longitude: d.longitude != null ? String(d.longitude) : '', matchNames: d.matchNames ?? [],
        seoTitle: d.seoTitle ?? '', seoDescription: d.seoDescription ?? '', ogImageUrl: d.ogImageUrl ?? '',
      })
      setSections(parseSections(d.sections))
    }).finally(() => setLoading(false))
  }, [id, router])

  const set = (patch: Partial<CityForm>) => setForm(f => (f ? { ...f, ...patch } : f))

  async function save() {
    if (!form) return
    setSaving(true); setMsg(null)
    try {
      const r = await fetch(`/api/admin/cidades/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, order: Number(form.order) || 0, latitude: form.latitude || null, longitude: form.longitude || null, sections }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? 'Falha ao salvar')
      setSections(parseSections(d.sections))
      if (d.slug && d.slug !== form.slug) set({ slug: d.slug })
      setMsg({ ok: true, text: 'Salvo.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Falha ao salvar' })
    } finally { setSaving(false) }
  }

  async function generateDraft() {
    setAiBusy(true); setAiWarning('')
    try {
      const r = await fetch(`/api/admin/cidades/${id}/rascunho-ia`, { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? (r.status === 503 ? 'IA indisponível: configure a chave do Gemini.' : 'Falha ao gerar'))
      setSections(cur => mergeDraft(cur, parseSections(d.sections)))
      setAiWarning(d.warning ?? 'Rascunho gerado por IA: revise e cite fontes antes de publicar.')
    } catch (e) {
      setAiWarning(e instanceof Error ? e.message : 'Falha ao gerar rascunho')
    } finally { setAiBusy(false) }
  }

  if (loading || !form) return <div className="p-10 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <Link href="/admin/cidades" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1e3a8a]"><ArrowLeft className="w-4 h-4" /> Cidades</Link>
          <h1 className="text-2xl font-bold text-[#1e3a8a] truncate">{form.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
          {form.status === 'PUBLISHED' && <a href={`/cidades/${form.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#eff6ff] rounded-lg px-4 py-2 text-sm font-medium"><Eye className="w-4 h-4" /> Ver</a>}
          <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${tab === t.id ? 'border-[#ea580c] text-[#1e3a8a]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'dados' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="Nome" value={form.name} onChange={name => set({ name })} />
            <TextInput label="Slug (URL)" value={form.slug} onChange={slug => set({ slug })} hint={`/cidades/${form.slug || '…'}`} />
            <TextInput label="Tagline" value={form.tagline} onChange={tagline => set({ tagline })} placeholder="A cidade que mais cresce no DF" className="md:col-span-2" />
            <TextArea label="Resumo" value={form.summary} onChange={summary => set({ summary })} rows={4} className="md:col-span-2" />
            <ImageUpload label="Capa" value={form.coverUrl || undefined} onChange={u => set({ coverUrl: u ?? '' })} />
            <TextInput label="Vídeo da capa (YouTube)" value={form.videoUrl} onChange={videoUrl => set({ videoUrl })} placeholder="https://youtu.be/…" />
            <Select label="Status" value={form.status} onChange={status => set({ status })} options={[{ value: 'DRAFT', label: 'Rascunho' }, { value: 'PUBLISHED', label: 'Publicada' }]} />
            <TextInput label="Ordem" type="number" value={form.order} onChange={order => set({ order })} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-[#1e3a8a] mb-3">Dados fixos da região</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextInput label="RA (nº)" value={form.raNumber} onChange={raNumber => set({ raNumber })} placeholder="RA XII" />
              <TextInput label="Fundação" value={form.foundedAt} onChange={foundedAt => set({ foundedAt })} placeholder="25/10/1989" />
              <TextInput label="Governador fundador" value={form.founderGovernor} onChange={founderGovernor => set({ founderGovernor })} />
              <TextInput label="População" value={form.population} onChange={population => set({ population })} placeholder="245 mil" />
              <TextInput label="Fonte da população" value={form.populationSource} onChange={populationSource => set({ populationSource })} placeholder="PDAD 2021 / Codeplan" />
              <TextInput label="Área (km²)" value={form.areaKm2} onChange={areaKm2 => set({ areaKm2 })} />
              <TextInput label="Distância ao Plano Piloto (km)" value={form.distanceKm} onChange={distanceKm => set({ distanceKm })} />
              <TextInput label="Latitude" value={form.latitude} onChange={latitude => set({ latitude })} placeholder="-15.87" />
              <TextInput label="Longitude" value={form.longitude} onChange={longitude => set({ longitude })} placeholder="-48.08" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <ChipsInput label="Nomes que casam com os imóveis (cidade/bairro dos anúncios)" value={form.matchNames} onChange={matchNames => set({ matchNames })}
              hint="Ex.: Samambaia, Samambaia Sul, Samambaia Norte. Usados nas seções de imóveis/empreendimentos e no preço médio do m²." />
          </div>
          {/* v1.3 — Viver aqui */}
          <AreaInsightPanel kind="city" id={id} insightId={areaInsightId} address={`${form.name}, Distrito Federal`} />
        </div>
      )}

      {tab === 'secoes' && (
        <div className="space-y-4 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void generateDraft()} disabled={aiBusy} className="inline-flex items-center gap-2 border border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#eff6ff] rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
              {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Gerar rascunho com IA
            </button>
            <span className="text-xs text-gray-500">Preenche história, linha do tempo, nomes, números e locais nas seções ainda vazias.</span>
          </div>
          {aiWarning && <p className={`rounded-lg px-3 py-2 text-sm ${/indispon|Falha/i.test(aiWarning) ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{aiWarning}</p>}
          <SectionEditor value={sections} onChange={setSections} context={{ cityNames: form.matchNames, pageName: form.name, pageKind: 'Página da cidade do DF' }} />
        </div>
      )}

      {tab === 'seo' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 gap-4 max-w-2xl">
          <TextInput label="Título (SEO)" value={form.seoTitle} onChange={seoTitle => set({ seoTitle })} placeholder={`Imóveis em ${form.name}: guia completo`} hint={`${form.seoTitle.length}/60 caracteres recomendados`} />
          <TextArea label="Descrição (SEO)" value={form.seoDescription} onChange={seoDescription => set({ seoDescription })} rows={3} />
          <ImageUpload label="Imagem de compartilhamento (og:image)" value={form.ogImageUrl || undefined} onChange={u => set({ ogImageUrl: u ?? '' })} />
        </div>
      )}

      {tab === 'preview' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <p className="text-sm text-gray-600">Salve as alterações e abra a página pública. Páginas em rascunho retornam 404 no site.</p>
          <a href={`/cidades/${form.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white rounded-lg px-4 py-2 text-sm font-medium"><Eye className="w-4 h-4" /> Abrir /cidades/{form.slug}</a>
        </div>
      )}
    </div>
  )
}
