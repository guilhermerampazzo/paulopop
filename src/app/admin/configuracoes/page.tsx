'use client'

import { useState, useEffect, useRef } from 'react'
import {
  User, Phone, Share2, Layout, Search, Mail, Puzzle,
  Save, Eye, CheckCircle, AlertCircle, Upload, Loader2, ImageIcon, BarChart3, FileText } from 'lucide-react'

const TABS = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'contatos', label: 'Contatos', icon: Phone },
  { id: 'redes', label: 'Redes Sociais', icon: Share2 },
  { id: 'aparencia', label: 'Aparência do Site', icon: Layout },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'email', label: 'E-mail', icon: Mail },
  { id: 'integracoes', label: 'Integrações', icon: Puzzle },
  { id: 'rastreamento', label: 'Rastreamento', icon: BarChart3 },
  { id: 'legal', label: 'Páginas legais', icon: FileText },
] as const

type TabId = typeof TABS[number]['id']

interface Config {
  ownerName?: string
  ownerCreci?: string
  ownerBio?: string
  ownerCompany?: string
  ownerCompanyCreci?: string
  ownerPhotoUrl?: string
  ownerPhone?: string
  ownerWhatsapp?: string
  ownerEmail?: string
  ownerAddress?: string
  ownerInstagram?: string
  ownerFacebook?: string
  ownerLinkedin?: string
  ownerYoutube?: string
  ownerTelegram?: string
  ownerTwitter?: string
  heroTitle?: string
  heroSubtitle?: string
  heroBgUrl?: string
  whatsappMessage?: string
  metaTitle?: string
  metaDescription?: string
  ogImageUrl?: string
  logoUrl?: string
  smtpHost?: string
  smtpPort?: string
  smtpUser?: string
  smtpPassword?: string
  notificationEmail?: string
  geminiApiKey?: string
  ga4Id?: string
  metaPixelId?: string
  gtmId?: string
  privacyPolicy?: string
  termsOfUse?: string
  businessHours?: string
  googleBusinessUrl?: string
  mapEmbedUrl?: string
  googleMapsKey?: string
  footerText?: string
  showDestaques?: boolean
  showCompra?: boolean
  showLocacao?: boolean
  showApartamentos?: boolean
  showCasas?: boolean
  showTerrenos?: boolean
}

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('perfil')
  const [config, setConfig] = useState<Config>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const heroBgRef = useRef<HTMLInputElement>(null)
  const ogRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/configuracoes')
      .then(r => r.json())
      .then((data: Config) => setConfig(data ?? {}))
      .finally(() => setLoading(false))
  }, [])

  function set(field: keyof Config, value: string | boolean) {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  async function uploadImage(file: File, field: keyof Config) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Falha no upload')
    const { url } = await res.json() as { url: string }
    set(field, url)
  }

  async function handleSave() {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error()
      setFeedback({ type: 'success', msg: 'Configurações salvas com sucesso!' })
    } catch {
      setFeedback({ type: 'error', msg: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleTestEmail() {
    setTestingEmail(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/configuracoes/test-email', { method: 'POST' })
      if (!res.ok) throw new Error()
      setFeedback({ type: 'success', msg: 'E-mail de teste enviado!' })
    } catch {
      setFeedback({ type: 'error', msg: 'Falha ao enviar e-mail de teste.' })
    } finally {
      setTestingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" aria-label="Carregando configurações..." />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a8a]">Configurações</h1>
          <p className="text-sm text-gray-500">Personalize o site sem precisar de desenvolvedor</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 border border-[#1e3a8a] text-[#1e3a8a] rounded-xl text-sm font-medium hover:bg-[#1e3a8a] hover:text-white transition-colors"
            aria-label="Visualizar site em nova aba"
          >
            <Eye className="w-4 h-4" />
            Ver Site
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
            aria-label="Salvar configurações"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          role="alert"
          aria-live="polite"
          className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.type === 'success'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />
          }
          {feedback.msg}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar de tabs */}
        <nav
          className="lg:w-48 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible"
          aria-label="Abas de configuração"
        >
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#1e3a8a] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Conteúdo da aba */}
        <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm space-y-5">
          {/* ─── PERFIL ─── */}
          {activeTab === 'perfil' && (
            <>
              <h2 className="font-semibold text-[#1e3a8a] text-lg">Perfil do Corretor</h2>
              {/* Foto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto do Corretor</label>
                <div className="flex items-center gap-4">
                  {config.ownerPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={config.ownerPhotoUrl}
                      alt="Foto do corretor"
                      className="w-20 h-20 rounded-full object-cover border-2 border-[#2563eb]"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-xl text-sm hover:border-[#2563eb] transition-colors"
                    aria-label="Alterar foto do corretor"
                  >
                    <Upload className="w-4 h-4" /> Alterar foto
                  </button>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-hidden="true"
                    onChange={async e => {
                      const file = e.target.files?.[0]
                      if (file) await uploadImage(file, 'ownerPhotoUrl')
                    }}
                  />
                </div>
              </div>

              <Field label="Nome completo" value={config.ownerName} onChange={v => set('ownerName', v)} />
              <Field label="CRECI" value={config.ownerCreci} onChange={v => set('ownerCreci', v)} />
              <Field label="Empresa" value={config.ownerCompany} onChange={v => set('ownerCompany', v)} />
              <Field label="CRECI da Empresa" value={config.ownerCompanyCreci} onChange={v => set('ownerCompanyCreci', v)} />
              <Field
                label="Biografia"
                value={config.ownerBio}
                onChange={v => set('ownerBio', v)}
                multiline
                rows={4}
              />
            </>
          )}

          {/* ─── CONTATOS ─── */}
          {activeTab === 'contatos' && (
            <>
              <h2 className="font-semibold text-[#1e3a8a] text-lg">Informações de Contato</h2>
              <Field label="WhatsApp (com DDI, ex: 5561912345678)" value={config.ownerWhatsapp} onChange={v => set('ownerWhatsapp', v)} type="tel" />
              <Field label="Telefone" value={config.ownerPhone} onChange={v => set('ownerPhone', v)} type="tel" />
              <Field label="E-mail de contato" value={config.ownerEmail} onChange={v => set('ownerEmail', v)} type="email" />
              <Field label="Endereço da empresa" value={config.ownerAddress} onChange={v => set('ownerAddress', v)} />
            </>
          )}

          {/* ─── REDES SOCIAIS ─── */}
          {activeTab === 'redes' && (
            <>
              <h2 className="font-semibold text-[#1e3a8a] text-lg">Redes Sociais</h2>
              <Field label="Instagram (URL)" value={config.ownerInstagram} onChange={v => set('ownerInstagram', v)} type="url" />
              <Field label="Facebook (URL)" value={config.ownerFacebook} onChange={v => set('ownerFacebook', v)} type="url" />
              <Field label="LinkedIn (URL)" value={config.ownerLinkedin} onChange={v => set('ownerLinkedin', v)} type="url" />
              <Field label="YouTube (URL)" value={config.ownerYoutube} onChange={v => set('ownerYoutube', v)} type="url" />
              <Field label="Telegram (URL ou número)" value={config.ownerTelegram} onChange={v => set('ownerTelegram', v)} />
              <Field label="Twitter/X (URL)" value={config.ownerTwitter} onChange={v => set('ownerTwitter', v)} type="url" />
            </>
          )}

          {/* ─── APARÊNCIA ─── */}
          {activeTab === 'aparencia' && (
            <>
              <h2 className="font-semibold text-[#1e3a8a] text-lg">Aparência do Site</h2>

              {/* Logo do site */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logomarca do Site</label>
                <p className="text-xs text-gray-400 mb-2">Exibida no cabeçalho do site (PNG transparente recomendado)</p>
                <div className="flex items-center gap-4">
                  {config.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={config.logoUrl} alt="Logo do site" className="h-14 max-w-[180px] object-contain border border-gray-200 rounded-xl p-1 bg-white" />
                  ) : (
                    <div className="w-20 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => logoRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-xl text-sm hover:border-[#2563eb] transition-colors"
                    aria-label="Alterar logomarca do site"
                  >
                    <Upload className="w-4 h-4" /> Alterar logo
                  </button>
                  {config.logoUrl && (
                    <button
                      type="button"
                      onClick={() => set('logoUrl', '')}
                      className="text-xs text-red-500 hover:text-red-700"
                      aria-label="Remover logomarca"
                    >
                      Remover
                    </button>
                  )}
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-hidden="true"
                    onChange={async e => {
                      const file = e.target.files?.[0]
                      if (file) await uploadImage(file, 'logoUrl')
                    }}
                  />
                </div>
              </div>

              <Field label="Título do Hero" value={config.heroTitle} onChange={v => set('heroTitle', v)} />
              <Field label="Subtítulo do Hero" value={config.heroSubtitle} onChange={v => set('heroSubtitle', v)} />
              <Field label="Mensagem padrão WhatsApp" value={config.whatsappMessage} onChange={v => set('whatsappMessage', v)} />
              <Field label="Texto do rodapé" value={config.footerText} onChange={v => set('footerText', v)} />

              {/* Foto de fundo do hero */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto de fundo do Hero</label>
                <div className="flex items-center gap-4">
                  {config.heroBgUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={config.heroBgUrl} alt="Fundo do hero" className="w-32 h-20 object-cover rounded-xl" />
                  )}
                  <button
                    type="button"
                    onClick={() => heroBgRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-xl text-sm hover:border-[#2563eb] transition-colors"
                    aria-label="Alterar imagem de fundo do hero"
                  >
                    <Upload className="w-4 h-4" /> Alterar imagem
                  </button>
                  <input
                    ref={heroBgRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-hidden="true"
                    onChange={async e => {
                      const file = e.target.files?.[0]
                      if (file) await uploadImage(file, 'heroBgUrl')
                    }}
                  />
                </div>
              </div>

              {/* Seções da Home */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seções da página inicial</label>
                <p className="text-xs text-gray-400 mb-4">
                  Seções sem imóveis cadastrados ficam ocultas automaticamente, independente desta configuração.
                </p>
                <div className="space-y-3">
                  {([
                    { field: 'showDestaques',    label: 'Destaques',    desc: 'Vitrine geral de imóveis' },
                    { field: 'showCompra',        label: 'Compra',       desc: 'Imóveis à venda' },
                    { field: 'showLocacao',       label: 'Locação',      desc: 'Imóveis para alugar' },
                    { field: 'showApartamentos',  label: 'Apartamentos', desc: 'Categoria: apartamentos' },
                    { field: 'showCasas',         label: 'Casas',        desc: 'Categoria: casas e sobrados' },
                    { field: 'showTerrenos',      label: 'Terrenos',     desc: 'Categoria: terrenos e áreas' },
                  ] as const).map(({ field, label, desc }) => (
                    <label key={field} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{label}</p>
                        <p className="text-xs text-gray-400">{desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={config[field] ?? true}
                        onClick={() => set(field, !(config[field] ?? true))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                          (config[field] ?? true) ? 'bg-[#2563eb]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            (config[field] ?? true) ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─── SEO ─── */}
          {activeTab === 'seo' && (
            <>
              <h2 className="font-semibold text-[#1e3a8a] text-lg">SEO e Meta Tags</h2>
              <Field
                label="Meta Title padrão"
                value={config.metaTitle}
                onChange={v => set('metaTitle', v)}
                hint="Exibido na aba do navegador e nos resultados do Google"
              />
              <Field
                label="Meta Description padrão"
                value={config.metaDescription}
                onChange={v => set('metaDescription', v)}
                multiline
                rows={3}
                hint="Máx. 160 caracteres"
              />
              {/* OG Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OG Image padrão</label>
                <p className="text-xs text-gray-400 mb-2">Exibida ao compartilhar o site em redes sociais (1200×630 px recomendado)</p>
                <div className="flex items-center gap-4">
                  {config.ogImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={config.ogImageUrl} alt="OG Image" className="w-40 h-20 object-cover rounded-xl" />
                  )}
                  <button
                    type="button"
                    onClick={() => ogRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-xl text-sm hover:border-[#2563eb] transition-colors"
                    aria-label="Alterar OG image padrão"
                  >
                    <Upload className="w-4 h-4" /> Alterar imagem
                  </button>
                  <input
                    ref={ogRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-hidden="true"
                    onChange={async e => {
                      const file = e.target.files?.[0]
                      if (file) await uploadImage(file, 'ogImageUrl')
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* ─── EMAIL ─── */}
          {activeTab === 'email' && (
            <>
              <h2 className="font-semibold text-[#1e3a8a] text-lg">Configurações de E-mail (SMTP)</h2>
              <Field label="SMTP Host" value={config.smtpHost} onChange={v => set('smtpHost', v)} placeholder="smtp.gmail.com" />
              <Field label="SMTP Porta" value={config.smtpPort} onChange={v => set('smtpPort', v)} placeholder="587" />
              <Field label="SMTP Usuário" value={config.smtpUser} onChange={v => set('smtpUser', v)} type="email" />
              <Field label="SMTP Senha" value={config.smtpPassword} onChange={v => set('smtpPassword', v)} type="password" />
              <Field
                label="E-mail de notificação de leads"
                value={config.notificationEmail}
                onChange={v => set('notificationEmail', v)}
                type="email"
                hint="Você receberá um e-mail cada vez que um novo lead for enviado"
              />
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#2563eb] text-[#2563eb] rounded-xl text-sm font-medium hover:bg-[#2563eb] hover:text-white transition-colors disabled:opacity-60"
                aria-label="Enviar e-mail de teste"
              >
                {testingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Testar envio
              </button>
            </>
          )}

          {/* ─── RASTREAMENTO (v1.1) ─── */}
          {activeTab === 'rastreamento' && (
            <>
              <h2 className="font-semibold text-[#1e3a8a] text-lg">Rastreamento (GA4, Meta Pixel e GTM)</h2>
              <p className="text-sm text-gray-500">Preencha só os IDs que você usa. Nada carrega no painel. Eventos enviados: page_view, view_item (imóvel), generate_lead (formulário), whatsapp_click e search.</p>
              <Field label="ID do Google Analytics 4" value={config.ga4Id} onChange={v => set('ga4Id', v)} placeholder="G-XXXXXXXXXX" hint="Administrador → Fluxos de dados → ID da métrica" />
              <Field label="ID do Meta Pixel" value={config.metaPixelId} onChange={v => set('metaPixelId', v)} placeholder="1234567890123456" hint="Gerenciador de Eventos → Fontes de dados" />
              <Field label="ID do Google Tag Manager" value={config.gtmId} onChange={v => set('gtmId', v)} placeholder="GTM-XXXXXXX" hint="Opcional. Se usar o GTM para tudo, deixe GA4 e Pixel em branco para não contar em dobro." />
            </>
          )}

          {/* ─── PÁGINAS LEGAIS E CONTATO (v1.1) ─── */}
          {activeTab === 'legal' && (
            <>
              <h2 className="font-semibold text-[#1e3a8a] text-lg">Páginas legais e dados de atendimento</h2>
              <p className="text-sm text-gray-500">Os textos abaixo aparecem em /politica-de-privacidade e /termos-de-uso. Se ficarem em branco, o site usa um texto padrão com o seu nome, CRECI e e-mail.</p>
              <Field label="Política de Privacidade" value={config.privacyPolicy} onChange={v => set('privacyPolicy', v)} multiline rows={12} hint="Texto simples; linhas em branco separam parágrafos. Linhas começando com ## viram títulos." />
              <Field label="Termos de Uso" value={config.termsOfUse} onChange={v => set('termsOfUse', v)} multiline rows={10} />
              <Field label="Horário de atendimento" value={config.businessHours} onChange={v => set('businessHours', v)} placeholder="Segunda a sexta, 8h às 19h · Sábado, 9h às 13h" />
              <Field label="Link do perfil no Google (Maps)" value={config.googleBusinessUrl} onChange={v => set('googleBusinessUrl', v)} placeholder="https://maps.app.goo.gl/..." />
              <Field label="Mapa incorporado (URL do iframe do Google Maps)" value={config.mapEmbedUrl} onChange={v => set('mapEmbedUrl', v)} placeholder="https://www.google.com/maps/embed?pb=..." hint="Google Maps → Compartilhar → Incorporar um mapa → copie só o endereço src=" />
            </>
          )}

          {/* ─── INTEGRAÇÕES ─── */}
          {activeTab === 'integracoes' && (
            <>
              <h2 className="font-semibold text-[#1e3a8a] text-lg">Integrações e Chaves de API</h2>
              <Field
                label="Google Gemini API Key"
                value={config.geminiApiKey}
                onChange={v => set('geminiApiKey', v)}
                type="password"
                hint="Obter em https://aistudio.google.com/app/apikey — necessária para geração de textos e análise de mercado"
              />
              <Field
                label="Google Maps API Key"
                value={config.googleMapsKey}
                onChange={v => set('googleMapsKey', v)}
                type="password"
                hint="Opcional — necessária apenas se quiser usar Google Maps em vez de OpenStreetMap"
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Componente de campo reutilizável ────────────────────────────────────────

function Field({
  label, value, onChange, type = 'text', multiline = false, rows = 3, hint, placeholder,
}: {
  label: string
  value?: string
  onChange: (v: string) => void
  type?: string
  multiline?: boolean
  rows?: number
  hint?: string
  placeholder?: string
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  const className =
    'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-colors'

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
      )}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}
