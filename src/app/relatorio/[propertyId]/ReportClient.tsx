'use client'

import { useState, useEffect } from 'react'
import { Lock, FileText, Mail, RefreshCw, Download, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ReportData {
  property: {
    ref: string
    title: string | null
    propertyType: string | null
    city: string | null
    state: string | null
    neighborhood: string | null
    address: string | null
    number: string | null
    price: number | null
    totalArea: number | null
    usefulArea: number | null
    bedrooms: number | null
    bathrooms: number | null
    suites: number | null
    totalParkingSpots: number | null
    description: string | null
    condominiumFee: number | null
    iptu: number | null
    constructionYear: number | null
    agent: {
      name: string
      creci: string | null
      company: string | null
      phone: string | null
      email: string | null
    }
    images: Array<{ url: string }>
    marketAnalyses: Array<{
      generatedAt: string
      marketValue: number | null
      optimisticValue: number | null
      competitiveValue: number | null
      pricePositioning: string | null
      marketDemand: string | null
      absoptionTime: number | null
      avgPricePerSqmRegion: number | null
      aiSummary: string | null
      aiStrengths: unknown
      aiWeaknesses: unknown
      aiOpportunities: unknown
      aiRecommendations: unknown
    }>
  }
}

function fmt(value: number | null): string {
  if (!value) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

function toArr(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[]
  return []
}

export function ReportClient({ propertyId }: { propertyId: string }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Email sending state
  const [emailModal, setEmailModal] = useState(false)
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [generated, setGenerated] = useState<{ password: string; emailed: boolean } | null>(null)

  // Corretor logado com acesso ao imóvel abre direto, sem senha
  useEffect(() => {
    let cancelled = false
    fetch(`/api/relatorio/${propertyId}`)
      .then(async r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d?.property) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [propertyId])

  const handleUnlock = async () => {
    if (password.length !== 5) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/relatorio/${propertyId}?senha=${encodeURIComponent(password)}`)
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Senha incorreta ou relatório não encontrado')
      }
      const d = await res.json()
      setData(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!ownerEmail) return
    setSending(true)
    setError(null)
    try {
      // v1.1: o servidor gera uma senha nova, grava o hash e envia o e-mail (exige login do corretor)
      const res = await fetch(`/api/relatorio/${propertyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerEmail, ownerName }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'Não foi possível gerar o acesso')
      setGenerated({ password: d.password, emailed: !!d.emailed })
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar')
    } finally {
      setSending(false)
    }
  }

  const handlePrint = () => window.print()

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-[#F0F4F8] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-[#2563eb]" />
          </div>
          <h1 className="font-display text-xl font-bold text-[#1e3a8a] mb-2">Relatório Protegido</h1>
          <p className="text-sm text-gray-400 mb-6">Insira a senha de 5 dígitos para acessar o relatório.</p>

          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={password}
            onChange={e => setPassword(e.target.value.replace(/\D/g, ''))}
            placeholder="00000"
            className="w-full text-center text-2xl tracking-[0.5em] border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563eb] mb-4 font-mono"
            aria-label="Senha do relatório"
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          />

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <Button
            className="w-full"
            onClick={handleUnlock}
            disabled={password.length !== 5 || loading}
            loading={loading}
          >
            <Lock size={16} />
            Acessar Relatório
          </Button>
        </div>
      </div>
    )
  }

  const { property } = data
  const analysis = property.marketAnalyses[0] ?? null

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* Action bar — hidden on print */}
      <div className="print:hidden bg-[#1e3a8a] py-3 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white">
          <FileText size={18} />
          <span className="font-semibold text-sm">Relatório de Análise de Mercado</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-white/30 text-white hover:bg-white hover:text-[#1e3a8a]"
            onClick={() => setEmailModal(true)}
            aria-label="Enviar por e-mail"
          >
            <Mail size={14} />
            Enviar por E-mail
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/30 text-white hover:bg-white hover:text-[#1e3a8a]"
            onClick={handlePrint}
            aria-label="Baixar PDF"
          >
            <Download size={14} />
            Imprimir / PDF
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Cover */}
        <div className="bg-[#1e3a8a] rounded-2xl p-8 text-white">
          <p className="text-[#2563eb] text-xs font-semibold uppercase tracking-widest mb-2">Análise de Mercado</p>
          <h1 className="font-display text-3xl font-bold mb-1">{property.title ?? property.propertyType ?? 'Imóvel'}</h1>
          <p className="text-blue-200 text-sm">
            {property.neighborhood && `${property.neighborhood}, `}{property.city} — {property.state}
          </p>
          <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap gap-6 text-sm text-blue-100">
            <span><strong className="text-white">Ref:</strong> {property.ref}</span>
            {property.price && <span><strong className="text-white">Preço:</strong> {fmt(property.price)}</span>}
            {property.totalArea && <span><strong className="text-white">Área:</strong> {property.totalArea}m²</span>}
            {property.bedrooms != null && <span><strong className="text-white">Dorms:</strong> {property.bedrooms}</span>}
          </div>
        </div>

        {/* Property details */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-[#1e3a8a] mb-4">Características do Imóvel</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Tipo', value: property.propertyType },
              { label: 'Área Total', value: property.totalArea ? `${property.totalArea}m²` : null },
              { label: 'Área Útil', value: property.usefulArea ? `${property.usefulArea}m²` : null },
              { label: 'Dormitórios', value: property.bedrooms },
              { label: 'Banheiros', value: property.bathrooms },
              { label: 'Suítes', value: property.suites },
              { label: 'Vagas', value: property.totalParkingSpots },
              { label: 'Condomínio', value: fmt(property.condominiumFee) },
              { label: 'IPTU', value: fmt(property.iptu) },
              { label: 'Ano de Construção', value: property.constructionYear },
              { label: 'Preço', value: fmt(property.price) },
              { label: 'Endereço', value: property.address ? `${property.address}${property.number ? `, ${property.number}` : ''}` : null },
            ].filter(i => i.value != null && i.value !== '—').map(item => (
              <div key={item.label}>
                <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                <p className="font-medium text-[#1e3a8a]">{String(item.value)}</p>
              </div>
            ))}
          </div>
          {property.description && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Descrição</p>
              <p className="text-sm text-gray-600 leading-relaxed">{property.description}</p>
            </div>
          )}
        </div>

        {/* Market analysis */}
        {analysis && (
          <>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-[#1e3a8a] mb-4">Análise de Mercado</h2>
              <p className="text-xs text-gray-400 mb-4">Gerada em {new Date(analysis.generatedAt).toLocaleDateString('pt-BR')}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#F0F4F8] rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-600 uppercase mb-1">Valor Otimista</p>
                  <p className="font-display text-xl font-bold text-[#1e3a8a]">{fmt(analysis.optimisticValue)}</p>
                </div>
                <div className="bg-[#1e3a8a] rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-300 uppercase mb-1">Valor de Mercado</p>
                  <p className="font-display text-xl font-bold text-white">{fmt(analysis.marketValue)}</p>
                </div>
                <div className="bg-[#F0F4F8] rounded-xl p-4">
                  <p className="text-xs font-semibold text-orange-600 uppercase mb-1">Valor Competitivo</p>
                  <p className="font-display text-xl font-bold text-[#1e3a8a]">{fmt(analysis.competitiveValue)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-4">
                {analysis.pricePositioning && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                    {analysis.pricePositioning}
                  </span>
                )}
                {analysis.marketDemand && (
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                    Demanda {analysis.marketDemand}
                  </span>
                )}
                {analysis.absoptionTime && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    ~{analysis.absoptionTime} dias para venda
                  </span>
                )}
                {analysis.avgPricePerSqmRegion && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    Média região: {fmt(analysis.avgPricePerSqmRegion)}/m²
                  </span>
                )}
              </div>

              {analysis.aiSummary && (
                <div className="bg-[#F0F4F8] rounded-xl p-4">
                  <p className="text-xs font-semibold text-[#1e3a8a] mb-2">Resumo da Análise</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{analysis.aiSummary}</p>
                </div>
              )}
            </div>

            {/* SWOT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'Pontos Fortes', items: toArr(analysis.aiStrengths), color: 'text-green-500' },
                { title: 'Pontos de Atenção', items: toArr(analysis.aiWeaknesses), color: 'text-red-400' },
                { title: 'Oportunidades', items: toArr(analysis.aiOpportunities), color: 'text-yellow-500' },
                { title: 'Recomendações', items: toArr(analysis.aiRecommendations), color: 'text-[#2563eb]' },
              ].filter(s => s.items.length > 0).map(section => (
                <div key={section.title} className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className={`font-semibold text-sm mb-3 ${section.color}`}>{section.title}</h3>
                  <ul className="space-y-1.5">
                    {section.items.map((item, i) => (
                      <li key={i} className="text-xs text-gray-600 flex gap-2">
                        <span className={`mt-0.5 ${section.color}`}>•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Agent info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-[#1e3a8a] mb-3">Corretor Responsável</h2>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Nome</p>
              <p className="font-medium text-[#1e3a8a]">{property.agent.name}</p>
            </div>
            {property.agent.creci && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">CRECI</p>
                <p className="font-medium text-[#1e3a8a]">{property.agent.creci}</p>
              </div>
            )}
            {property.agent.company && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Empresa</p>
                <p className="font-medium text-[#1e3a8a]">{property.agent.company}</p>
              </div>
            )}
            {property.agent.phone && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Telefone</p>
                <p className="font-medium text-[#1e3a8a]">{property.agent.phone}</p>
              </div>
            )}
            {property.agent.email && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">E-mail</p>
                <p className="font-medium text-[#1e3a8a]">{property.agent.email}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-[#1e3a8a] mb-1">Enviar por E-mail</h3>
            <p className="text-sm text-gray-400 mb-4">Uma senha nova de 5 dígitos é gerada e gravada; o proprietário recebe o link e a senha por e-mail. Só o corretor logado consegue gerar.</p>
            {generated && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                Senha gerada: <strong className="font-mono tracking-widest">{generated.password}</strong>
                {generated.emailed ? ' — enviada por e-mail.' : ' — o e-mail não está configurado; envie a senha pelo WhatsApp.'}
              </div>
            )}
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nome do Proprietário</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  placeholder="João Silva"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">E-mail do Proprietário *</label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={e => setOwnerEmail(e.target.value)}
                  placeholder="proprietario@email.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEmailModal(false)}>Cancelar</Button>
              <Button
                onClick={handleSendEmail}
                disabled={!ownerEmail || sending}
                loading={sending}
                aria-label="Enviar relatório por e-mail"
              >
                {sent ? (
                  <>
                    <RefreshCw size={14} />
                    Enviado!
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
