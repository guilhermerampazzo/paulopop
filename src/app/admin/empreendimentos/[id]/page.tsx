'use client'

import { AreaInsightPanel } from '@/components/admin/AreaInsightPanel'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { EstruturaEditor } from '@/components/admin/EstruturaEditor'
import { Building2, ImagePlus, Trash2, Save, Eye, ArrowLeft, Plus, X } from 'lucide-react'

interface EmpImage { id?: string; url: string; thumbnailUrl?: string; caption?: string; order: number; category: string }
interface FloorPlan { id?: string; url: string; caption?: string; order: number }

interface FormData {
  name: string; tagline: string; description: string; status: string
  tipologiasDescription: string; lazerDescription: string
  address: string; neighborhood: string; city: string; state: string; zipCode: string
  latitude: string; longitude: string; locationDescription: string
  deliveryDate: string; totalUnits: string; floors: string; architect: string
  bedroomsMin: string; bedroomsMax: string; suitesMin: string; suitesMax: string; areaMin: string; areaMax: string
  priceMin: string; priceMax: string; financing: string; paymentInfo: string; banks: string
  amenities: string; highlights: string
  ctaLabel: string; ctaWhatsapp: string
  youtubeUrl: string; virtualTourUrl: string; virtualTourType: string
  stage: string; deliveryYear: string; builder: string; elevators: string; condoFeeAvg: string; petsAllowed: string; rules: string
}

const TABS = [
  { id: 'geral', label: 'Geral' },
  { id: 'tipologias', label: 'Apartamentos' },
  { id: 'lazer', label: 'Área de Lazer' },
  { id: 'localizacao', label: 'Localização' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'midia', label: 'Vídeos' },
  { id: 'estrutura', label: 'Estrutura e unidades' },
]

const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white'

export default function EmpreendimentoEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState('geral')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [images, setImages] = useState<EmpImage[]>([])
  const [floorPlanImages, setFloorPlanImages] = useState<FloorPlan[]>([])
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTarget = useRef<string>('FACHADA')

  const emptyForm: FormData = {
    name: '', tagline: '', description: '', status: 'DRAFT',
    tipologiasDescription: '', lazerDescription: '',
    address: '', neighborhood: '', city: '', state: '', zipCode: '',
    latitude: '', longitude: '', locationDescription: '',
    deliveryDate: '', totalUnits: '', floors: '', architect: '',
    bedroomsMin: '', bedroomsMax: '', areaMin: '', areaMax: '',
    suitesMin: '', suitesMax: '',
    priceMin: '', priceMax: '', financing: '', paymentInfo: '', banks: '',
    amenities: '', highlights: '',
    ctaLabel: '', ctaWhatsapp: '',
    youtubeUrl: '', virtualTourUrl: '', virtualTourType: 'NONE',
    stage: 'ENTREGUE', deliveryYear: '', builder: '', elevators: '', condoFeeAvg: '', petsAllowed: '', rules: '',
  }

  const [form, setForm] = useState<FormData>(emptyForm)
  const [areaInsightId, setAreaInsightId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/empreendimentos/${id}`)
      .then(r => r.json())
      .then(data => {
        setAreaInsightId(data.areaInsightId ?? null)
        setForm({
          name: data.name ?? '', tagline: data.tagline ?? '',
          description: data.description ?? '', status: data.status ?? 'DRAFT',
          tipologiasDescription: data.tipologiasDescription ?? '',
          lazerDescription: data.lazerDescription ?? '',
          address: data.address ?? '', neighborhood: data.neighborhood ?? '',
          city: data.city ?? '', state: data.state ?? '', zipCode: data.zipCode ?? '',
          latitude: data.latitude ? String(data.latitude) : '',
          longitude: data.longitude ? String(data.longitude) : '',
          locationDescription: data.locationDescription ?? '',
          deliveryDate: data.deliveryDate ?? '',
          totalUnits: data.totalUnits ? String(data.totalUnits) : '',
          floors: data.floors ? String(data.floors) : '',
          architect: data.architect ?? '',
          bedroomsMin: data.bedroomsMin ? String(data.bedroomsMin) : '',
          bedroomsMax: data.bedroomsMax ? String(data.bedroomsMax) : '',
          suitesMin: data.suitesMin ? String(data.suitesMin) : '',
          suitesMax: data.suitesMax ? String(data.suitesMax) : '',
          areaMin: data.areaMin ? String(data.areaMin) : '',
          areaMax: data.areaMax ? String(data.areaMax) : '',
          priceMin: data.priceMin ? String(data.priceMin) : '',
          priceMax: data.priceMax ? String(data.priceMax) : '',
          financing: data.financing ?? '', paymentInfo: data.paymentInfo ?? '',
          banks: data.banks ?? '',
          amenities: data.amenities ?? '', highlights: data.highlights ?? '',
          ctaLabel: data.ctaLabel ?? '', ctaWhatsapp: data.ctaWhatsapp ?? '',
          youtubeUrl: data.youtubeUrl ?? '', virtualTourUrl: data.virtualTourUrl ?? '',
          virtualTourType: data.virtualTourType ?? 'NONE',
          stage: data.stage ?? 'ENTREGUE', deliveryYear: data.deliveryYear ? String(data.deliveryYear) : '',
          builder: data.builder ?? '', elevators: data.elevators ? String(data.elevators) : '',
          condoFeeAvg: data.condoFeeAvg ? String(data.condoFeeAvg) : '', petsAllowed: data.petsAllowed === true ? 'sim' : data.petsAllowed === false ? 'nao' : '', rules: data.rules ?? '',
        })
        setImages(data.images ?? [])
        setFloorPlanImages(data.floorPlanImages ?? [])
      })
      .finally(() => setLoading(false))
  }, [id])

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/empreendimentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, images, floorPlanImages }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erro ao salvar'); return }
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirm('Excluir este empreendimento? Esta ação não pode ser desfeita.')) return
    await fetch(`/api/empreendimentos/${id}`, { method: 'DELETE' })
    router.push('/admin/empreendimentos')
  }

  async function uploadFile(file: File): Promise<{ url: string; thumbnailUrl?: string } | null> {
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) return null
    return res.json()
  }

  function triggerUpload(target: string) {
    uploadTarget.current = target
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const target = uploadTarget.current
    setUploadingFor(target)
    const results = await Promise.all(files.map(f => uploadFile(f)))
    const valid = results.filter(Boolean) as { url: string; thumbnailUrl?: string }[]
    if (target === 'PLANTS') {
      setFloorPlanImages(prev => [...prev, ...valid.map((r, i) => ({ url: r.url, order: prev.length + i }))])
    } else {
      setImages(prev => [...prev, ...valid.map((r, i) => ({ url: r.url, thumbnailUrl: r.thumbnailUrl, order: prev.filter(x => x.category === target).length + i, category: target }))])
    }
    setUploadingFor(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const imagesOf = (cat: string) => images.filter(i => i.category === cat)
  const removeImage = (url: string) => setImages(prev => prev.filter(i => i.url !== url))
  const removeFloor = (url: string) => setFloorPlanImages(prev => prev.filter(i => i.url !== url))
  const fmtCurrency = (v: string) => v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }) : ''

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#2563eb] border-t-transparent" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto pb-24">
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/empreendimentos')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#1e3a8a]">{form.name || 'Empreendimento'}</h1>
            <p className="text-xs text-gray-400">Editar empreendimento</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {form.status === 'PUBLISHED' && (
            <a href={`/empreendimentos/${id}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              <Eye className="w-4 h-4" />Ver no site
            </a>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1e3a8a] text-white text-sm font-medium rounded-lg hover:bg-[#172554] disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'geral' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Identificação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do empreendimento *</label>
                <input value={form.name} onChange={set('name')} className={inputCls} placeholder="Ex: Residencial Parque das Flores" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Slogan / Tagline</label>
                <input value={form.tagline} onChange={set('tagline')} className={inputCls} placeholder="Ex: Seu novo lar em harmonia com a natureza" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total de unidades</label>
                <input type="number" value={form.totalUnits} onChange={set('totalUnits')} className={inputCls} placeholder="132" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de andares</label>
                <input type="number" value={form.floors} onChange={set('floors')} className={inputCls} placeholder="12" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Previsão de entrega</label>
                <input value={form.deliveryDate} onChange={set('deliveryDate')} className={inputCls} placeholder="Dezembro/2026" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arquiteto / Construtora</label>
                <input value={form.architect} onChange={set('architect')} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={set('status')} className={inputCls}>
                  <option value="DRAFT">Rascunho</option>
                  <option value="PUBLISHED">Publicado (visível no site)</option>
                </select>
              </div>
              {/* v1.2: estágio e dados do prédio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estágio</label>
                <select value={form.stage} onChange={set('stage')} className={inputCls}>
                  <option value="LANCAMENTO">Lançamento (na planta)</option>
                  <option value="EM_OBRAS">Em obras</option>
                  <option value="ENTREGUE">Pronto para morar (entregue)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ano de entrega</label>
                <input type="number" value={form.deliveryYear} onChange={set('deliveryYear')} className={inputCls} placeholder="2015" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Construtora</label>
                <input value={form.builder} onChange={set('builder')} className={inputCls} placeholder="Ex.: Ebm, MRV, Emplavi" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Elevadores por bloco</label>
                <input type="number" value={form.elevators} onChange={set('elevators')} className={inputCls} placeholder="0 = sem elevador" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condomínio médio (R$/mês)</label>
                <input type="number" step="0.01" value={form.condoFeeAvg} onChange={set('condoFeeAvg')} className={inputCls} placeholder="350" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aceita pets?</label>
                <select value={form.petsAllowed} onChange={set('petsAllowed')} className={inputCls}>
                  <option value="">Não informado</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Regras e observações do condomínio</label>
                <textarea rows={3} value={form.rules} onChange={set('rules')} className={inputCls} placeholder="Portaria 24h, vaga demarcada, horário de mudança…" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp para contato</label>
                <input value={form.ctaWhatsapp} onChange={set('ctaWhatsapp')} className={inputCls} placeholder="5511999999999" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Sobre o empreendimento</h2>
            <textarea value={form.description} onChange={set('description')} rows={6} className={inputCls}
              placeholder="Fale sobre o empreendimento, sua proposta, diferenciais..." />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destaques (um por linha)</label>
              <textarea value={form.highlights} onChange={set('highlights')} rows={4} className={inputCls}
                placeholder="Varanda gourmet em todas as unidades" />
            </div>
          </div>
          <ImageSection title="Fachada" description="Fotos externas do empreendimento"
            images={imagesOf('FACHADA')} category="FACHADA" onUpload={triggerUpload} onRemove={removeImage} uploading={uploadingFor === 'FACHADA'} />
          <ImageSection title="Áreas Comuns" description="Hall, portaria, piscina, etc."
            images={imagesOf('AREAS_COMUNS')} category="AREAS_COMUNS" onUpload={triggerUpload} onRemove={removeImage} uploading={uploadingFor === 'AREAS_COMUNS'} />
        </div>
      )}

      {tab === 'tipologias' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Apartamentos e Tipologias</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Quartos (mín)</label>
                <input type="number" value={form.bedroomsMin} onChange={set('bedroomsMin')} className={inputCls} placeholder="2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Quartos (máx)</label>
                <input type="number" value={form.bedroomsMax} onChange={set('bedroomsMax')} className={inputCls} placeholder="4" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Suítes (mín)</label>
                <input type="number" value={form.suitesMin} onChange={set('suitesMin')} className={inputCls} placeholder="1" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Suítes (máx)</label>
                <input type="number" value={form.suitesMax} onChange={set('suitesMax')} className={inputCls} placeholder="2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Área privativa mín (m²)</label>
                <input type="number" value={form.areaMin} onChange={set('areaMin')} className={inputCls} placeholder="65" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Área privativa máx (m²)</label>
                <input type="number" value={form.areaMax} onChange={set('areaMax')} className={inputCls} placeholder="120" /></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição das tipologias</label>
              <textarea value={form.tipologiasDescription} onChange={set('tipologiasDescription')} rows={7} className={inputCls}
                placeholder="Descreva os tipos de apartamento, torres, diferenciais de cada tipologia..." />
            </div>
          </div>
          <ImageSection title="Plantas Baixas" description="Plantas dos apartamentos e tipologias"
            images={floorPlanImages.map(f => ({ ...f, category: 'PLANTS' }))}
            category="PLANTS" onUpload={triggerUpload} onRemove={removeFloor} uploading={uploadingFor === 'PLANTS'} />
        </div>
      )}

      {tab === 'lazer' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Área de Lazer</h2>
            <textarea value={form.lazerDescription} onChange={set('lazerDescription')} rows={8} className={inputCls}
              placeholder="Piscina adulto e infantil, academia, salão de festas, playground, churrasqueiras..." />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amenidades (uma por linha)</label>
              <textarea value={form.amenities} onChange={set('amenities')} rows={5} className={inputCls}
                placeholder="Piscina" />
            </div>
          </div>
          <ImageSection title="Fotos da Área de Lazer" description="Piscina, academia, salão de festas..."
            images={imagesOf('LAZER')} category="LAZER" onUpload={triggerUpload} onRemove={removeImage} uploading={uploadingFor === 'LAZER'} />
        </div>
      )}

      {tab === 'localizacao' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Endereço</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input value={form.address} onChange={set('address')} className={inputCls} placeholder="Rua, Av., número..." />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input value={form.neighborhood} onChange={set('neighborhood')} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <input value={form.zipCode} onChange={set('zipCode')} className={inputCls} placeholder="00000-000" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input value={form.city} onChange={set('city')} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select value={form.state} onChange={set('state')} className={inputCls}>
                  <option value="">Selecione</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input value={form.latitude} onChange={set('latitude')} className={inputCls} placeholder="-23.5505" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input value={form.longitude} onChange={set('longitude')} className={inputCls} placeholder="-46.6333" /></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Vizinhança e Entorno</h2>
            <textarea value={form.locationDescription} onChange={set('locationDescription')} rows={7} className={inputCls}
              placeholder="A 300m do Supermercado Extra, a 500m da estação de metrô..." />
          </div>
          <ImageSection title="Fotos da Região" description="Supermercado, metrô, parques próximos..."
            images={imagesOf('LOCALIZACAO')} category="LOCALIZACAO" onUpload={triggerUpload} onRemove={removeImage} uploading={uploadingFor === 'LOCALIZACAO'} />
          {/* v1.3 — Viver aqui */}
          <AreaInsightPanel kind="empreendimento" id={id} insightId={areaInsightId} address={[form.address, form.neighborhood, form.city, form.state].filter(Boolean).join(', ')} />
        </div>
      )}

      {tab === 'financeiro' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Preços</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço a partir de (R$)</label>
                <input type="number" value={form.priceMin} onChange={set('priceMin')} className={inputCls} placeholder="350000" />
                {form.priceMin && <p className="text-xs text-[#2563eb] mt-1">{fmtCurrency(form.priceMin)}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço até (R$)</label>
                <input type="number" value={form.priceMax} onChange={set('priceMax')} className={inputCls} placeholder="680000" />
                {form.priceMax && <p className="text-xs text-[#2563eb] mt-1">{fmtCurrency(form.priceMax)}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de financiamento</label>
                <input value={form.financing} onChange={set('financing')} className={inputCls} placeholder="MCMV, FGTS, Direto com a construtora" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Formas de Pagamento</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Informações de pagamento</label>
              <textarea value={form.paymentInfo} onChange={set('paymentInfo')} rows={5} className={inputCls}
                placeholder="Entrada de 20% + 80% financiado. Parcelas a partir de R$ 1.200/mês..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bancos financiadores</label>
              <textarea value={form.banks} onChange={set('banks')} rows={3} className={inputCls}
                placeholder="Caixa Econômica Federal, Banco do Brasil, Bradesco..." />
            </div>
          </div>
        </div>
      )}

      {tab === 'estrutura' && <EstruturaEditor empreendimentoId={id} />}

      {tab === 'midia' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-6">
            <h2 className="font-semibold text-[#1e3a8a]">Vídeo YouTube</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link do YouTube</label>
              <input value={form.youtubeUrl} onChange={set('youtubeUrl')} className={inputCls}
                placeholder="https://www.youtube.com/watch?v=..." />
              <p className="text-xs text-gray-400 mt-1">Cole o link completo do vídeo (não use Shorts)</p>
            </div>
            {form.youtubeUrl && (() => {
              const match = form.youtubeUrl.match(/(?:shorts\/|v=|youtu\.be\/)([^&?/\s]+)/)
              if (!match) return <p className="text-xs text-red-500">Link inválido</p>
              return (
                <div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
                  <iframe
                    src={`https://www.youtube.com/embed/${match[1]}`}
                    className="w-full h-full border-0"
                    allowFullScreen
                    title="Preview do vídeo"
                  />
                </div>
              )
            })()}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <h2 className="font-semibold text-[#1e3a8a]">Tour Virtual</h2>
            <div className="flex gap-6">
              {(['NONE', 'OTHER'] as const).map(v => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="virtualTourType" value={v}
                    checked={form.virtualTourType === v}
                    onChange={() => setForm(prev => ({ ...prev, virtualTourType: v }))}
                    className="accent-[#2563eb]" />
                  <span className="text-sm text-gray-700">{v === 'NONE' ? 'Nenhum' : 'Tour Virtual'}</span>
                </label>
              ))}
            </div>
            {form.virtualTourType !== 'NONE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link do Tour Virtual</label>
                <input value={form.virtualTourUrl} onChange={set('virtualTourUrl')} className={inputCls}
                  placeholder="https://..." />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-10">
        <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1.5">
          <Trash2 className="w-4 h-4" />Excluir empreendimento
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#1e3a8a] text-white text-sm font-medium rounded-lg hover:bg-[#172554] disabled:opacity-50">
          <Save className="w-4 h-4" />{saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  )
}

function ImageSection({ title, description, images, category, onUpload, onRemove, uploading }: {
  title: string; description: string
  images: { url: string; thumbnailUrl?: string; caption?: string; category: string }[]
  category: string; onUpload: (cat: string) => void
  onRemove: (url: string) => void; uploading: boolean
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-[#1e3a8a]">{title}</h2>
        <button onClick={() => onUpload(category)} disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a8a] text-white text-xs font-medium rounded-lg hover:bg-[#172554] disabled:opacity-50">
          <ImagePlus className="w-3.5 h-3.5" />{uploading ? 'Enviando...' : 'Adicionar fotos'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">{description}</p>
      {images.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center cursor-pointer hover:border-[#2563eb] transition-colors"
          onClick={() => onUpload(category)}>
          <ImagePlus className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Clique para adicionar fotos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div key={img.url + idx} className="relative group aspect-video rounded-xl overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumbnailUrl ?? img.url} alt={img.caption ?? ''} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button onClick={() => onRemove(img.url)} className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <button onClick={() => onUpload(category)}
            className="aspect-video rounded-xl border-2 border-dashed border-gray-200 hover:border-[#2563eb] flex items-center justify-center text-gray-300 hover:text-[#2563eb] transition-colors">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  )
}

void [Building2]
