'use client'

import { useState } from 'react'
import { MessageCircle, Send, Loader2 } from 'lucide-react'
import { trackEvent } from '@/components/public/Analytics'

interface ContactFormProps {
  propertyId?: string
  propertySlug?: string
  propertyRef?: string
  whatsapp?: string
  whatsappMessage?: string
}

const DDI_OPTIONS = [
  { code: '+55', flag: '🇧🇷', label: 'Brasil' },
  { code: '+1', flag: '🇺🇸', label: 'EUA' },
  { code: '+351', flag: '🇵🇹', label: 'Portugal' },
  { code: '+34', flag: '🇪🇸', label: 'Espanha' },
  { code: '+44', flag: '🇬🇧', label: 'Reino Unido' },
  { code: '+49', flag: '🇩🇪', label: 'Alemanha' },
  { code: '+33', flag: '🇫🇷', label: 'França' },
  { code: '+39', flag: '🇮🇹', label: 'Itália' },
]

export function ContactForm({ propertyId, propertySlug, propertyRef, whatsapp, whatsappMessage }: ContactFormProps) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    ddi: '+55',
    phone: '',
    email: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`.trim(),
          phone: `${form.ddi} ${form.phone}`.trim(),
          email: form.email || undefined,
          message: form.message || undefined,
          propertyId: propertyId || undefined,
          source: 'SITE',
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao enviar mensagem.')
      }
      trackEvent('generate_lead', { method: 'form', property_id: propertyId ?? '', page_path: window.location.pathname })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-[#1e3a8a] mb-2">Mensagem enviada!</h3>
        <p className="text-gray-600 text-sm">Paulo Pop entrará em contato em breve.</p>
      </div>
    )
  }

  const cleanWhatsapp = whatsapp?.replace(/\D/g, '') ?? ''
  const waMessage = whatsappMessage
    ?? (propertySlug
      ? `Olá! Tenho interesse no imóvel${propertyRef ? ` ${propertyRef}` : ''}: ${typeof window !== 'undefined' ? window.location.origin : ''}/imoveis/${propertySlug}`
      : 'Olá! Gostaria de mais informações sobre imóveis.')
  const waHref = cleanWhatsapp
    ? `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(waMessage)}`
    : '#'

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Formulário de contato">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="firstName">
            Primeiro Nome <span className="text-red-500">*</span>
          </label>
          <input
            id="firstName"
            type="text"
            required
            value={form.firstName}
            onChange={e => update('firstName', e.target.value)}
            placeholder="João"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="lastName">
            Último Nome
          </label>
          <input
            id="lastName"
            type="text"
            value={form.lastName}
            onChange={e => update('lastName', e.target.value)}
            placeholder="Silva"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="phone">
          Telefone <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <select
            value={form.ddi}
            onChange={e => update('ddi', e.target.value)}
            aria-label="Código do país"
            className="w-28 border border-gray-200 rounded-lg px-2 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            {DDI_OPTIONS.map(d => (
              <option key={d.code} value={d.code}>
                {d.flag} {d.code}
              </option>
            ))}
          </select>
          <input
            id="phone"
            type="tel"
            required
            value={form.phone}
            onChange={e => update('phone', e.target.value)}
            placeholder="(11) 99999-9999"
            className="min-w-0 flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={e => update('email', e.target.value)}
          placeholder="joao@exemplo.com"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>

      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="message">
          Comentários
        </label>
        <textarea
          id="message"
          value={form.message}
          onChange={e => update('message', e.target.value)}
          placeholder="Olá, tenho interesse neste imóvel..."
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] resize-none"
        />
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* v1.1: aviso de privacidade (LGPD) */}
      <p className="mb-3 text-[11px] leading-relaxed text-gray-400">
        Ao enviar, você concorda com a nossa{' '}
        <a href="/politica-de-privacidade" className="underline hover:text-gray-600" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>.
        Seus dados são usados só para responder ao seu contato.
      </p>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#1e3a8a] hover:bg-[#172554] text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Enviar mensagem
      </button>

      {cleanWhatsapp && (
        <>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 uppercase tracking-widest">Ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold rounded-xl transition-colors"
            aria-label="Enviar mensagem pelo WhatsApp"
          >
            <MessageCircle className="w-4 h-4" fill="white" strokeWidth={0} />
            WhatsApp
          </a>
        </>
      )}
    </form>
  )
}
