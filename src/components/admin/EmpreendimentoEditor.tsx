'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Globe, FileText, Upload, X, Loader2, ArrowLeft, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface ImgItem { id: string; url: string; caption?: string | null }

interface EmpreendimentoData {
  id?: string
  name: string
  tagline: string
  description: string
  status: 'DRAFT' | 'PUBLISHED'
  address: string
  neighborhood: string
  city: string
  state: string
  architect: string
  deliveryDate: string
  totalUnits: string
  floors: string
  bedroomsMin: string
  bedroomsMax: string
  areaMin: string
  areaMax: string
  priceMin: string
  priceMax: string
  financing: string
  coverUrl: string
  logoUrl: string
  amenities: string
  highlights: string
  ctaLabel: string
  ctaWhatsapp: string
  images: ImgItem[]
  floorPlanImages: ImgItem[]
}

const EMPTY: EmpreendimentoData = {
  name: '', tagline: '', description: '', status: 'DRAFT',
  address: '', neighborhood: '', city: '', state: '',
  architect: '', deliveryDate: '', totalUnits: '', floors: '',
  bedroomsMin: '', bedroomsMax: '', areaMin: '', areaMax: '',
  priceMin: '', priceMax: '', financing: '', coverUrl: '', logoUrl: '',
  amenities: '', highlights: '', ctaLabel: '', ctaWhatsapp: '',
  images: [], floorPlanImages: [],
}

function Field({ label, value, onChange, placeholder, hint, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; hint?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
      />
    </div>
  )
}

export function EmpreendimentoEditor({ initial }: { initial?: Partial<EmpreendimentoData> & { id?: string } }) {
  const router = useRouter()
  const [form, setForm] = useState<EmpreendimentoData>({ ...EMPTY, ...initial })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const floorplanRef = useRef<HTMLInputElement>(null)

  const isEdit = !!initial?.id

  function set<K extends keyof EmpreendimentoData>(field: K, value: EmpreendimentoData[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('Falha no upload')
    const { url } = await res.json() as { url: string }
    return url
  }

  async function handleUpload(file: File, field: 'coverUrl' | 'logoUrl') {
    setUploading(field)
    try {
      const url = await uploadFile(file)
      set(field, url)
    } catch { setFeedback({ type: 'error', msg: 'Falha no upload.' }) }
    finally { setUploading(null) }
  }

  async function handleGalleryUpload(files: FileList, type: 'gallery' | 'floorplan') {
    if (!isEdit) { setFeedback({ type: 'error', msg: 'Salve o empreendimento primeiro.' }); return }
    setUploading(type)
    try {
      for (const file of Array.from(files)) {
        const url = await uploadFile(file)
        const res = await fetch(`/api/admin/empreendimentos/${initial!.id}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, type }),
        })
        const img = await res.json() as ImgItem
        if (type === 'gallery') set('images', [...form.images, img])
        else set('floorPlanImages', [...form.floorPlanImages, img])
      }
    } catch { setFeedback({ type: 'error', msg: 'Falha no upload de imagens.' }) }
    finally { setUploading(null) }
  }

  async function removeImage(imageId: string, type: 'gallery' | 'floorplan') {
    if (!isEdit) return
    await fetch(`/api/admin/empreendimentos/${initial!.id}/images`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId, type }),
    })
    if (type === 'gallery') set('images', form.images.filter(i => i.id !== imageId))
    else set('floorPlanImages', form.floorPlanImages.filter(i => i.id !== imageId))
  }

  async function handleSave(statusOverride?: 'DRAFT' | 'PUBLISHED') {
    if (!form.name.trim()) { setFeedback({ type: 'error', msg: 'Nome obrigatório.' }); return }
    setSaving(true); setFeedback(null)
    const payload = { ...form, status: statusOverride ?? form.status }
    try {
      const url = isEdit ? `/api/admin/empreendimentos/${initial!.id}` : '/api/admin/empreendimentos'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? 'Erro')
      const saved = await res.json() as { id: string }
      setFeedback({ type: 'success', msg: payload.status === 'PUBLISHED' ? 'Publicado!' : 'Rascunho salvo!' })
      if (!isEdit) setTimeout(() => router.push(`/admin/empreendimentos/${saved.id}`), 800)
    } catch (e) {
      setFeedback({ type: 'error', msg: e instanceof Error ? e.message : 'Erro ao salvar' })
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/empreendimentos" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" aria-label="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#1e3a8a]">{isEdit ? 'Editar Empreendimento' : 'Novo Empreendimento'}</h1>
          <p className="text-sm text-gray-500">
            {form.status === 'PUBLISHED'
              ? <span className="text-green-600 flex items-center gap-1"><Globe className="w-3 h-3" /> Publicado</span>
              : <span className="text-amber-600 flex items-center gap-1"><FileText className="w-3 h-3" /> Rascunho</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleSave('DRAFT')} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-60 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Rascunho
          </button>
          <button onClick={() => handleSave('PUBLISHED')} disabled={saving || !form.name}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white rounded-xl text-sm font-medium hover:bg-[#172554] disabled:opacity-60 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />} Publicar
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div role="alert" className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.msg}
          <button onClick={() => setFeedback(null)} className="ml-auto"><X className="w-3 h-3" /></button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">

          {/* Identificação */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Identificação</h2>
            <Field label="Nome do empreendimento *" value={form.name} onChange={v => set('name', v)} placeholder="Ex: Paradiso Samambaia" />
            <Field label="Tagline" value={form.tagline} onChange={v => set('tagline', v)} placeholder="Ex: O primeiro lar dos seus sonhos começa aqui!" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5}
                placeholder="Descreva o empreendimento..."
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] resize-y" />
            </div>
          </div>

          {/* Localização */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Localização</h2>
            <Field label="Endereço" value={form.address} onChange={v => set('address', v)} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Bairro" value={form.neighborhood} onChange={v => set('neighborhood', v)} />
              <Field label="Cidade" value={form.city} onChange={v => set('city', v)} />
            </div>
            <Field label="Estado" value={form.state} onChange={v => set('state', v)} placeholder="Ex: DF" />
          </div>

          {/* Detalhes técnicos */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Detalhes Técnicos</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Arquiteto" value={form.architect} onChange={v => set('architect', v)} />
              <Field label="Previsão de entrega" value={form.deliveryDate} onChange={v => set('deliveryDate', v)} placeholder="Ex: Dez/2026" />
              <Field label="Total de unidades" value={form.totalUnits} onChange={v => set('totalUnits', v)} type="number" />
              <Field label="Pavimentos" value={form.floors} onChange={v => set('floors', v)} type="number" />
              <Field label="Quartos (mín)" value={form.bedroomsMin} onChange={v => set('bedroomsMin', v)} type="number" />
              <Field label="Quartos (máx)" value={form.bedroomsMax} onChange={v => set('bedroomsMax', v)} type="number" />
              <Field label="Área mín (m²)" value={form.areaMin} onChange={v => set('areaMin', v)} type="number" />
              <Field label="Área máx (m²)" value={form.areaMax} onChange={v => set('areaMax', v)} type="number" />
              <Field label="Preço a partir de (R$)" value={form.priceMin} onChange={v => set('priceMin', v)} type="number" />
              <Field label="Preço até (R$)" value={form.priceMax} onChange={v => set('priceMax', v)} type="number" />
            </div>
            <Field label="Financiamento" value={form.financing} onChange={v => set('financing', v)} placeholder="Ex: MCMV, FGTS, Direto com construtora" />
          </div>

          {/* Diferenciais */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Diferenciais</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amenidades / Lazer</label>
              <p className="text-xs text-gray-400 mb-1">Uma por linha. Ex: Piscina, Academia, Playground...</p>
              <textarea value={form.amenities} onChange={e => set('amenities', e.target.value)} rows={5}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] resize-y" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destaques / Pontos fortes</label>
              <p className="text-xs text-gray-400 mb-1">Uma por linha. Ex: Natureza circundante, Mobilidade urbana...</p>
              <textarea value={form.highlights} onChange={e => set('highlights', e.target.value)} rows={4}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] resize-y" />
            </div>
          </div>

          {/* Galeria */}
          {isEdit && (
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-[#1e3a8a]">Galeria de Fotos</h2>
                <button type="button" onClick={() => galleryRef.current?.click()} disabled={uploading === 'gallery'}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-xl text-sm hover:border-[#2563eb] transition-colors disabled:opacity-60">
                  {uploading === 'gallery' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Adicionar fotos
                </button>
                <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" aria-hidden="true"
                  onChange={e => { if (e.target.files) handleGalleryUpload(e.target.files, 'gallery'); e.target.value = '' }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {form.images.map(img => (
                  <div key={img.id} className="relative group aspect-video rounded-xl overflow-hidden bg-gray-100">
                    <Image src={img.url} alt="Foto" fill className="object-cover" />
                    <button onClick={() => removeImage(img.id, 'gallery')}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {form.images.length === 0 && <p className="col-span-3 text-sm text-gray-400">Nenhuma foto adicionada.</p>}
              </div>
            </div>
          )}

          {/* Plantas */}
          {isEdit && (
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-[#1e3a8a]">Plantas / Floor Plans</h2>
                <button type="button" onClick={() => floorplanRef.current?.click()} disabled={uploading === 'floorplan'}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-xl text-sm hover:border-[#2563eb] transition-colors disabled:opacity-60">
                  {uploading === 'floorplan' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Adicionar plantas
                </button>
                <input ref={floorplanRef} type="file" accept="image/*" multiple className="hidden" aria-hidden="true"
                  onChange={e => { if (e.target.files) handleGalleryUpload(e.target.files, 'floorplan'); e.target.value = '' }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {form.floorPlanImages.map(img => (
                  <div key={img.id} className="relative group aspect-video rounded-xl overflow-hidden bg-gray-100">
                    <Image src={img.url} alt="Planta" fill className="object-cover" />
                    <button onClick={() => removeImage(img.id, 'floorplan')}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {form.floorPlanImages.length === 0 && <p className="col-span-3 text-sm text-gray-400">Nenhuma planta adicionada.</p>}
              </div>
            </div>
          )}

          {!isEdit && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
              Salve o empreendimento primeiro para poder adicionar fotos e plantas.
            </div>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-5">
          {/* Capa */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Imagem de Capa</h3>
            {form.coverUrl ? (
              <div className="relative">
                <Image src={form.coverUrl} alt="Capa" width={280} height={160} className="w-full h-40 object-cover rounded-xl" />
                <button onClick={() => set('coverUrl', '')}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => coverRef.current?.click()} disabled={uploading === 'coverUrl'}
                className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#2563eb] hover:text-[#2563eb] transition-colors">
                {uploading === 'coverUrl' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                <span className="text-xs">Selecionar capa</span>
              </button>
            )}
            <input ref={coverRef} type="file" accept="image/*" className="hidden" aria-hidden="true"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'coverUrl') }} />
          </div>

          {/* Logo */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Logo do Empreendimento</h3>
            {form.logoUrl ? (
              <div className="relative">
                <Image src={form.logoUrl} alt="Logo" width={280} height={80} className="w-full h-20 object-contain rounded-xl bg-gray-50 p-2" />
                <button onClick={() => set('logoUrl', '')}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => logoRef.current?.click()} disabled={uploading === 'logoUrl'}
                className="w-full h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#2563eb] hover:text-[#2563eb] transition-colors">
                {uploading === 'logoUrl' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                <span className="text-xs">Selecionar logo</span>
              </button>
            )}
            <input ref={logoRef} type="file" accept="image/*" className="hidden" aria-hidden="true"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'logoUrl') }} />
          </div>

          {/* CTA */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Call to Action</h3>
            <Field label="Texto do botão" value={form.ctaLabel} onChange={v => set('ctaLabel', v)} placeholder="Ex: Quero saber mais" />
            <Field label="WhatsApp (CTA)" value={form.ctaWhatsapp} onChange={v => set('ctaWhatsapp', v)} placeholder="5561999999999" />
          </div>

          {/* Status */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Status</h3>
            <div className="space-y-2">
              {[
                { value: 'DRAFT', label: 'Rascunho', desc: 'Apenas visível no admin' },
                { value: 'PUBLISHED', label: 'Publicado', desc: 'Visível no site público' },
              ].map(opt => (
                <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="emp-status" value={opt.value}
                    checked={form.status === opt.value}
                    onChange={() => set('status', opt.value as 'DRAFT' | 'PUBLISHED')}
                    className="mt-0.5 accent-[#2563eb]" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {initial?.id && form.status === 'PUBLISHED' && (
            <a href={`/empreendimentos/${initial.id}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 w-full px-4 py-2.5 border border-[#1e3a8a] text-[#1e3a8a] rounded-xl text-sm font-medium hover:bg-[#1e3a8a] hover:text-white transition-colors">
              <Globe className="w-4 h-4" /> Ver landing page
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
