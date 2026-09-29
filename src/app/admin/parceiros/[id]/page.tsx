'use client'

/**
 * v1.3 — Painel › Parceiros › editor de um parceiro. Abas: Dados, Seções, SEO.
 */
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, Loader2, Save } from 'lucide-react'
import { SectionEditor } from '@/components/admin/SectionEditor'
import { parseSections, type Section } from '@/lib/sections'
import { Checkbox, ImageUpload, Select, TextArea, TextInput, inputCls } from '@/components/admin/sections/shared'
import { PARTNER_TYPES, PARTNER_TYPE_LABEL } from '@/lib/partners'

interface PartnerForm {
  name: string; slug: string; type: string; tagline: string; summary: string; logoUrl: string; coverUrl: string; benefit: string
  website: string; phone: string; whatsapp: string; email: string; address: string; mapEmbedUrl: string; instagram: string
  status: string; order: string; featured: boolean; empreendimentoIds: string[]; seoTitle: string; seoDescription: string
}
interface EmpOption { id: string; name: string; city?: string | null; status?: string }

const TABS = [{ id: 'dados', label: 'Dados' }, { id: 'secoes', label: 'Seções' }, { id: 'seo', label: 'SEO' }]

export default function AdminParceiroEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState('dados')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [form, setForm] = useState<PartnerForm | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [emps, setEmps] = useState<EmpOption[]>([])
  const [empQ, setEmpQ] = useState('')

  useEffect(() => {
    fetch(`/api/admin/parceiros/${id}`).then(async r => {
      if (!r.ok) { router.push('/admin/parceiros'); return }
      const d = await r.json()
      setForm({
        name: d.name ?? '', slug: d.slug ?? '', type: d.type ?? 'OUTRO', tagline: d.tagline ?? '', summary: d.summary ?? '', logoUrl: d.logoUrl ?? '', coverUrl: d.coverUrl ?? '',
        benefit: d.benefit ?? '', website: d.website ?? '', phone: d.phone ?? '', whatsapp: d.whatsapp ?? '', email: d.email ?? '', address: d.address ?? '', mapEmbedUrl: d.mapEmbedUrl ?? '',
        instagram: d.instagram ?? '', status: d.status ?? 'DRAFT', order: String(d.order ?? 0), featured: !!d.featured, empreendimentoIds: d.empreendimentoIds ?? [],
        seoTitle: d.seoTitle ?? '', seoDescription: d.seoDescription ?? '',
      })
      setSections(parseSections(d.sections))
    }).finally(() => setLoading(false))
    fetch('/api/empreendimentos?admin=true&limit=100').then(r => r.json()).then(d => setEmps((d.empreendimentos ?? []).map((e: EmpOption) => ({ id: e.id, name: e.name, city: e.city, status: e.status })))).catch(() => setEmps([]))
  }, [id, router])

  const set = (patch: Partial<PartnerForm>) => setForm(f => (f ? { ...f, ...patch } : f))

  async function save() {
    if (!form) return
    setSaving(true); setMsg(null)
    try {
      const r = await fetch(`/api/admin/parceiros/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, order: Number(form.order) || 0, sections }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? 'Falha ao salvar')
      setSections(parseSections(d.sections))
      if (d.slug && d.slug !== form.slug) set({ slug: d.slug })
      setMsg({ ok: true, text: 'Salvo.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Falha ao salvar' })
    } finally { setSaving(false) }
  }

  if (loading || !form) return <div className="p-10 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>

  const empFiltered = emps.filter(e => !empQ || e.name.toLowerCase().includes(empQ.toLowerCase()))

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <Link href="/admin/parceiros" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1e3a8a]"><ArrowLeft className="w-4 h-4" /> Parceiros</Link>
          <h1 className="text-2xl font-bold text-[#1e3a8a] truncate">{form.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
          {form.status === 'PUBLISHED' && <a href={`/parceiros/${form.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#eff6ff] rounded-lg px-4 py-2 text-sm font-medium"><Eye className="w-4 h-4" /> Ver</a>}
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
            <TextInput label="Slug (URL)" value={form.slug} onChange={slug => set({ slug })} hint={`/parceiros/${form.slug || '…'}`} />
            <Select label="Tipo" value={form.type} onChange={type => set({ type })} options={PARTNER_TYPES.map(t => ({ value: t, label: PARTNER_TYPE_LABEL[t] }))} />
            <TextInput label="Tagline" value={form.tagline} onChange={tagline => set({ tagline })} />
            <TextArea label="Resumo" value={form.summary} onChange={summary => set({ summary })} rows={4} className="md:col-span-2" />
            <TextArea label="Benefício para clientes do Paulo Pop" value={form.benefit} onChange={benefit => set({ benefit })} rows={3} className="md:col-span-2" />
            <ImageUpload label="Logo" value={form.logoUrl || undefined} onChange={u => set({ logoUrl: u ?? '' })} />
            <ImageUpload label="Capa" value={form.coverUrl || undefined} onChange={u => set({ coverUrl: u ?? '' })} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-[#1e3a8a] mb-3">Contato</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput label="Site" value={form.website} onChange={website => set({ website })} placeholder="https://…" />
              <TextInput label="Instagram" value={form.instagram} onChange={instagram => set({ instagram })} placeholder="@perfil ou URL" />
              <TextInput label="Telefone" value={form.phone} onChange={phone => set({ phone })} />
              <TextInput label="WhatsApp" value={form.whatsapp} onChange={whatsapp => set({ whatsapp })} placeholder="(61) 9…" />
              <TextInput label="E-mail" value={form.email} onChange={email => set({ email })} type="email" />
              <TextInput label="Endereço" value={form.address} onChange={address => set({ address })} />
              <TextInput label="URL do embed do Google Maps" value={form.mapEmbedUrl} onChange={mapEmbedUrl => set({ mapEmbedUrl })} placeholder="https://www.google.com/maps/embed?pb=…" className="md:col-span-2" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select label="Status" value={form.status} onChange={status => set({ status })} options={[{ value: 'DRAFT', label: 'Rascunho' }, { value: 'PUBLISHED', label: 'Publicado' }]} />
            <TextInput label="Ordem" type="number" value={form.order} onChange={order => set({ order })} />
            <div className="flex items-end pb-2"><Checkbox label="Destaque (aparece primeiro)" checked={form.featured} onChange={featured => set({ featured })} /></div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-[#1e3a8a] mb-1">Empreendimentos ligados</h2>
            <p className="text-xs text-gray-500 mb-3">Aparecem na página do parceiro (ex.: prédios da construtora).</p>
            <input aria-label="Filtrar empreendimentos" value={empQ} onChange={e => setEmpQ(e.target.value)} placeholder="Filtrar por nome" className={`${inputCls} mb-2`} />
            <ul className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
              {empFiltered.map(e => {
                const on = form.empreendimentoIds.includes(e.id)
                return (
                  <li key={e.id}>
                    <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={on} onChange={() => set({ empreendimentoIds: on ? form.empreendimentoIds.filter(x => x !== e.id) : [...form.empreendimentoIds, e.id] })} className="rounded border-gray-300" />
                      <span className="min-w-0 truncate">{e.name}</span>
                      <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{e.city} · {e.status}</span>
                    </label>
                  </li>
                )
              })}
              {empFiltered.length === 0 && <li className="px-3 py-2 text-xs text-gray-500">Nenhum empreendimento.</li>}
            </ul>
          </div>
        </div>
      )}

      {tab === 'secoes' && (
        <SectionEditor value={sections} onChange={setSections} context={{ pageName: form.name, pageKind: `Página do parceiro (${PARTNER_TYPE_LABEL[form.type as keyof typeof PARTNER_TYPE_LABEL] ?? form.type})` }} />
      )}

      {tab === 'seo' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 gap-4 max-w-2xl">
          <TextInput label="Título (SEO)" value={form.seoTitle} onChange={seoTitle => set({ seoTitle })} hint={`${form.seoTitle.length}/60 caracteres recomendados`} />
          <TextArea label="Descrição (SEO)" value={form.seoDescription} onChange={seoDescription => set({ seoDescription })} rows={3} />
        </div>
      )}
    </div>
  )
}
