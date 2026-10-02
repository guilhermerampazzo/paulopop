'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, X, Save, CheckCircle, Megaphone, FileText, BarChart3, AlertCircle, BadgeCheck, Wand2 } from 'lucide-react'
import { applyEmpreendimentoFill, isImportedProperty, type EmpreendimentoFill } from '@/lib/empreendimento-fill'
import { SaleModal } from '@/components/admin/SaleModal'
import { formatDuration } from '@/lib/sales'
import { Button } from '@/components/ui/Button'
import { MarketingPlanModal } from '@/components/admin/MarketingPlanModal'
import { ContractModal } from '@/components/admin/ContractModal'
import { TabPrincipal } from './TabPrincipal'
import { TabDescricao } from './TabDescricao'
import { TabImagensVideos } from './TabImagensVideos'
import { TabDocumentos } from './TabDocumentos'
import { TabPotencialComprador } from './TabPotencialComprador'
import { TabCorretores } from './TabCorretores'
import { TabAtividades } from './TabAtividades'
import { TabContatos } from './TabContatos'
import { TabPortais } from './TabPortais'
import { TabHistorico } from './TabHistorico'

const TABS = [
  { id: 'principal', label: 'Principal' },
  { id: 'descricao', label: 'Descrição' },
  { id: 'imagens', label: 'Imagens e Vídeos' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'potencial', label: 'Potencial Comprador' },
  { id: 'corretores', label: 'Corretores com Clientes' },
  { id: 'atividades', label: 'Atividades' },
  { id: 'contatos', label: 'Contatos' },
  { id: 'portais', label: 'Portais' },
  { id: 'historico', label: 'Histórico de Alterações' },
] as const

type TabId = typeof TABS[number]['id']

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Rascunho',  color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  ACTIVE:    { label: 'Ativo',     color: 'bg-green-100 text-green-800 border-green-200' },
  SOLD:      { label: 'Vendido',   color: 'bg-blue-100 text-blue-800 border-blue-200' },
  RENTED:    { label: 'Alugado',   color: 'bg-purple-100 text-purple-800 border-purple-200' },
  INACTIVE:  { label: 'Inativo',   color: 'bg-gray-100 text-gray-600 border-gray-200' },
  SUSPENDED: { label: 'Suspenso',  color: 'bg-red-100 text-red-700 border-red-200' },
}

interface PropertyFormProps {
  propertyId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData: Record<string, any>
}

export function PropertyForm({ propertyId, initialData }: PropertyFormProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('principal')
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [data, setData] = useState<Record<string, unknown>>(initialData)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState<string>(
    (initialData.status as string) ?? 'DRAFT'
  )
  const [showMarketingModal, setShowMarketingModal] = useState(false)
  const [showContractModal, setShowContractModal] = useState(false)
  // v1.4: anúncio importado de portal — confirmação de autorização antes de publicar
  const [authAsk, setAuthAsk] = useState<{ status: string } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Limpar mensagem de sucesso após 4 segundos
  useEffect(() => {
    if (!saveSuccess) return
    const t = setTimeout(() => setSaveSuccess(null), 4000)
    return () => clearTimeout(t)
  }, [saveSuccess])

  // Switches do cabeçalho
  const [transactionType, setTransactionType] = useState<'SALE' | 'RENT'>(
    (initialData.transactionType as 'SALE' | 'RENT') ?? 'SALE'
  )
  const [purpose, setPurpose] = useState<'RESIDENTIAL' | 'COMMERCIAL'>(
    (initialData.purpose as 'RESIDENTIAL' | 'COMMERCIAL') ?? 'RESIDENTIAL'
  )
  const [hideOnSite, setHideOnSite] = useState<boolean>(initialData.hideOnSite === true)

  const handleChange = useCallback((field: string, value: unknown) => {
    setData(prev => ({ ...prev, [field]: value }))
  }, [])

  // ─── v1.5: preenchimento automático a partir do empreendimento ───────────────
  // Só campos vazios recebem valor; imóvel importado não ganha fotos se já tiver galeria.
  const dataRef = useRef(data)
  dataRef.current = data
  const [fillNotice, setFillNotice] = useState<{ name: string; filled: string[]; imported: boolean } | null>(null)
  const [filling, setFilling] = useState(false)

  const fillFromEmpreendimento = useCallback(async (empId: string, unitId: string | null) => {
    if (!empId) return
    setFilling(true)
    try {
      const qs = unitId ? `?unitId=${encodeURIComponent(unitId)}` : ''
      const res = await fetch(`/api/admin/empreendimentos/${encodeURIComponent(empId)}/preenchimento${qs}`)
      if (!res.ok) throw new Error('Não foi possível ler o empreendimento')
      const body = await res.json() as { empreendimento: { name: string }; fill: EmpreendimentoFill }
      const current = dataRef.current
      const imported = isImportedProperty(current)
      const { patch, filled } = applyEmpreendimentoFill(current, body.fill, { imported })
      if (Object.keys(patch).length) setData(prev => ({ ...prev, ...patch }))
      setFillNotice({ name: body.empreendimento.name, filled, imported })
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erro ao preencher com o empreendimento')
    } finally {
      setFilling(false)
    }
  }, [])

  // Ao escolher o empreendimento ou a unidade na aba Principal, completa o que estiver vazio
  const handlePrincipalChange = useCallback((field: string, value: unknown) => {
    handleChange(field, value)
    if (field === 'empreendimentoId' && typeof value === 'string' && value) void fillFromEmpreendimento(value, null)
    if (field === 'unitId' && typeof value === 'string' && value) {
      const empId = dataRef.current.empreendimentoId
      if (typeof empId === 'string' && empId) void fillFromEmpreendimento(empId, value)
    }
  }, [handleChange, fillFromEmpreendimento])

  // "Cadastrar unidade" no empreendimento abre o imóvel novo com ?preencher=1
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const empId = initialData.empreendimentoId
    if (params.get('preencher') === '1' && typeof empId === 'string' && empId) {
      void fillFromEmpreendimento(empId, (initialData.unitId as string) || null)
      params.delete('preencher')
      const q = params.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save(status?: string, publishAuthConfirmed = false) {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)
    try {
      const payload: Record<string, unknown> = {
        ...data,
        transactionType,
        purpose,
        hideOnSite,
      }
      if (status) payload.status = status
      if (publishAuthConfirmed) payload.publishAuthConfirmed = true

      const res = await fetch(`/api/imoveis/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 409 && err.needsPublishAuth) {
          setAuthChecked(false)
          setAuthAsk({ status: status ?? 'ACTIVE' })
          return
        }
        throw new Error(err.error ?? 'Erro ao salvar')
      }
      if (publishAuthConfirmed) setData(prev => ({ ...prev, publishAuthConfirmedAt: new Date().toISOString() }))

      // Atualizar status exibido no cabeçalho
      const newStatus = status ?? currentStatus
      setCurrentStatus(newStatus)

      if (newStatus === 'DRAFT') {
        setSaveSuccess('Rascunho salvo com sucesso!')
      } else if (newStatus === 'ACTIVE') {
        setSaveSuccess('Imóvel publicado e ativado com sucesso!')
      } else {
        setSaveSuccess('Imóvel salvo com sucesso!')
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const statusInfo = STATUS_LABELS[currentStatus] ?? STATUS_LABELS.DRAFT

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#F0F4F8]">
      {/* v1.4: confirmação de autorização para publicar anúncio importado de portal */}
      {authAsk && (
        <div role="dialog" aria-modal="true" aria-labelledby="auth-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h2 id="auth-title" className="text-lg font-bold text-[#1e3a8a]">Confirmar autorização para publicar</h2>
            <p className="text-sm text-gray-600">Este imóvel foi importado de um portal de anúncios. A Lei 6.530/78 (art. 20, III) veda ao corretor anunciar imóvel sem autorização escrita. Publique somente se o anúncio for seu ou se você tiver essa autorização.</p>
            <label className="flex items-start gap-2 text-sm text-gray-800">
              <input type="checkbox" className="mt-1 accent-[#2563eb]" checked={authChecked} onChange={e => setAuthChecked(e.target.checked)} />
              <span>Confirmo que este anúncio é meu ou que tenho autorização escrita do proprietário para anunciá-lo.</span>
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAuthAsk(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
              <button type="button" disabled={!authChecked || saving} onClick={() => { const st = authAsk.status; setAuthAsk(null); void save(st, true) }} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#172554] disabled:opacity-50">Confirmar e publicar</button>
            </div>
          </div>
        </div>
      )}
      {/* Toast de sucesso — fixo no topo direito */}
      {saveSuccess && (
        <div
          role="alert"
          className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-top-2"
        >
          <CheckCircle className="w-4 h-4 shrink-0" />
          {saveSuccess}
        </div>
      )}

      {/* Toast de erro — fixo no topo direito */}
      {saveError && (
        <div
          role="alert"
          className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="ml-2 text-white/80 hover:text-white"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabeçalho do formulário */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Ref</p>
              <p className="text-sm font-semibold text-[#1e3a8a]">{initialData.ref ?? propertyId}</p>
              {initialData.agent && (
                <p className="text-xs text-gray-500">{(initialData.agent as { name: string }).name}</p>
              )}
            </div>
            {/* Badge de status atual */}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.color}`}
              aria-label={`Status: ${statusInfo.label}`}
            >
              {statusInfo.label}
            </span>
            {(currentStatus === 'SOLD' || currentStatus === 'RENTED') && data.daysOnMarket != null && (
              <span className="text-xs text-gray-500">em {formatDuration(Number(data.daysOnMarket))}{data.saleDiscountPct != null ? ` · desconto ${Number(data.saleDiscountPct).toLocaleString('pt-BR')}%` : ''}</span>
            )}
          </div>

          {/* Switches */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Venda / Aluguel */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setTransactionType('SALE')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  transactionType === 'SALE'
                    ? 'bg-[#1e3a8a] text-white shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Para Venda
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('RENT')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  transactionType === 'RENT'
                    ? 'bg-[#1e3a8a] text-white shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Para Alugar
              </button>
            </div>

            {/* Residencial / Comercial */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setPurpose('RESIDENTIAL')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  purpose === 'RESIDENTIAL'
                    ? 'bg-[#2563eb] text-white shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Residencial
              </button>
              <button
                type="button"
                onClick={() => setPurpose('COMMERCIAL')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  purpose === 'COMMERCIAL'
                    ? 'bg-[#2563eb] text-white shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Comercial
              </button>
            </div>

            {/* Ocultar no site */}
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <div
                role="switch"
                aria-checked={hideOnSite}
                onClick={() => setHideOnSite(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                  hideOnSite ? 'bg-red-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    hideOnSite ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
              Ocultar no site
            </label>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-0 min-w-max border-b border-gray-200">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#1e3a8a] text-[#1e3a8a]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo da aba */}
      <div className="flex-1 p-4 md:p-6">
        <div role="tabpanel">
          {/* v1.5: o que veio do empreendimento */}
          {fillNotice && (
            <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-[#D6E2F0] bg-[#F0F4F8] p-4 text-sm text-[#1e3a8a]">
              <Wand2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1">
                {fillNotice.filled.length ? (
                  <>
                    <p className="font-semibold">Preenchido a partir do empreendimento {fillNotice.name}</p>
                    <p className="mt-1 text-gray-700">{fillNotice.filled.join(', ')}.</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Só os campos que estavam vazios foram preenchidos; nada do que já existia foi alterado.
                      {fillNotice.imported ? ' Imóvel importado: a galeria de fotos do anúncio foi mantida.' : ''}
                      {' '}Confira, complete o que é desta unidade (preço, fotos do apartamento, descrição) e salve.
                    </p>
                  </>
                ) : (
                  <p>O empreendimento {fillNotice.name} não tinha nada a acrescentar: os campos que ele preenche já estavam preenchidos.</p>
                )}
              </div>
              <button type="button" onClick={() => setFillNotice(null)} className="text-gray-400 hover:text-gray-600" aria-label="Fechar aviso">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {activeTab === 'principal' && (
            <TabPrincipal
              data={data}
              onChange={handlePrincipalChange}
              onFillFromEmpreendimento={() => {
                const empId = data.empreendimentoId
                if (typeof empId === 'string' && empId) void fillFromEmpreendimento(empId, (data.unitId as string) || null)
              }}
              filling={filling}
            />
          )}
          {activeTab === 'descricao' && (
            <TabDescricao data={data} onChange={handleChange} />
          )}
          {activeTab === 'imagens' && (
            <TabImagensVideos
              propertyId={propertyId}
              images={(data.images as never) ?? []}
              videos={(data.videos as never) ?? []}
              virtualTourType={(data.virtualTourType as string) ?? 'NONE'}
              virtualTourUrl={(data.virtualTourUrl as string) ?? ''}
              externalLink={(data.externalLink as string) ?? ''}
              onImagesChange={imgs => handleChange('images', imgs)}
              onVideosChange={vids => handleChange('videos', vids)}
              onChange={handleChange}
            />
          )}
          {activeTab === 'documentos' && (
            <TabDocumentos
              documents={(data.documents as never) ?? []}
              onDocumentsChange={docs => handleChange('documents', docs)}
            />
          )}
          {activeTab === 'potencial' && <TabPotencialComprador />}
          {activeTab === 'corretores' && <TabCorretores />}
          {activeTab === 'atividades' && (
            <TabAtividades propertyId={propertyId} activities={(data.activities as never) ?? []} />
          )}
          {activeTab === 'contatos' && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <TabContatos leads={(data.leads as any[]) ?? []} />
          )}
          {activeTab === 'portais' && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <TabPortais portals={(data.portals as any[]) ?? []} onPortalsChange={p => handleChange('portals', p)} />
          )}
          {activeTab === 'historico' && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <TabHistorico activities={(data.activities as any[]) ?? []} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-4 md:px-6 py-3 sticky bottom-0 z-10">
        {/* v1.4: no celular os botões quebram de linha em vez de sair da tela */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              aria-label="Imprimir PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMarketingModal(true)}
              aria-label="Criar plano de marketing"
            >
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">Marketing</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContractModal(true)}
              aria-label="Criar contrato"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Contrato</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaleModal(true)}
              aria-label={transactionType === 'RENT' ? 'Marcar como alugado' : 'Marcar como vendido'}
              className="border-green-600 text-green-700 hover:bg-green-600 hover:text-white"
            >
              <BadgeCheck className="w-4 h-4" />
              <span className="hidden sm:inline">{currentStatus === 'SOLD' || currentStatus === 'RENTED' ? 'Registro da venda' : transactionType === 'RENT' ? 'Alugado' : 'Vendido'}</span>
            </Button>
            <a
              href={`/admin/estudos?propertyId=${propertyId}`}
              className="flex items-center gap-1 px-3 py-2 text-sm text-[#2563eb] hover:text-[#1e3a8a] border border-[#2563eb] rounded-md hover:bg-blue-50 transition-colors"
              aria-label="Estudo de mercado deste imóvel"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Estudo</span>
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/imoveis')}
              disabled={saving}
            >
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => save('DRAFT')}
              loading={saving}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-1" />
              {currentStatus === 'DRAFT' ? 'Salvar Rascunho' : 'Salvar como Rascunho'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => save(currentStatus === 'SOLD' || currentStatus === 'RENTED' ? currentStatus : 'ACTIVE')}
              loading={saving}
              disabled={saving}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {currentStatus === 'ACTIVE' || currentStatus === 'SOLD' || currentStatus === 'RENTED' ? 'Salvar Alterações' : 'Salvar e Ativar'}
            </Button>
          </div>
        </div>
      </div>

      {showMarketingModal && (
        <MarketingPlanModal
          propertyId={propertyId}
          propertyTitle={(data.title as string) ?? initialData.ref ?? propertyId}
          onClose={() => setShowMarketingModal(false)}
        />
      )}
      {showSaleModal && (
        <SaleModal
          propertyId={propertyId}
          transactionType={transactionType as 'SALE' | 'RENT'}
          listPrice={data.price != null && data.price !== '' ? Number(data.price) : null}
          listedAt={(data.publishedAt as string) ?? (data.registrationDate as string) ?? (initialData.createdAt as string) ?? null}
          current={{
            status: currentStatus,
            soldAt: data.soldAt as string | null,
            salePrice: data.salePrice as number | null,
            saleDiscountPct: data.saleDiscountPct as number | null,
            daysOnMarket: data.daysOnMarket as number | null,
            saleSource: data.saleSource as string | null,
            saleNotes: data.saleNotes as string | null,
            showSalePrice: Boolean(data.showSalePrice),
          }}
          onClose={() => setShowSaleModal(false)}
          onDone={(result) => {
            setShowSaleModal(false)
            if (result) {
              setCurrentStatus(String(result.status))
              setData(prev => ({ ...prev, ...result }))
              setSaveSuccess(`Imóvel marcado como ${result.status === 'RENTED' ? 'alugado' : 'vendido'}.`)
            } else {
              setCurrentStatus('ACTIVE')
              setData(prev => ({ ...prev, status: 'ACTIVE', soldAt: null, salePrice: null, saleDiscountPct: null, saleDiscountValue: null, daysOnMarket: null, saleSource: null, saleNotes: null, showSalePrice: false }))
              setSaveSuccess('Venda desfeita. O imóvel voltou a ficar ativo.')
            }
          }}
        />
      )}
      {showContractModal && (
        <ContractModal
          propertyId={propertyId}
          propertyTitle={(data.title as string) ?? initialData.ref ?? propertyId}
          onClose={() => setShowContractModal(false)}
        />
      )}
    </div>
  )
}
