'use client'

import { AreaInsightPanel } from '@/components/admin/AreaInsightPanel'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'

interface AdditionalFee {
  name: string
  value: string
  period: string
}

interface ParkingSpotRow {
  quantity: string
  type: string
}

interface RoomRow {
  name: string
  area: string
  description: string
}

interface TabPrincipalProps {
  data: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'SOLD', label: 'Vendido' },
  { value: 'RENTED', label: 'Alugado' },
  { value: 'INACTIVE', label: 'Inativo' },
  { value: 'SUSPENDED', label: 'Suspenso' },
]

const CONTRACT_OPTIONS = [
  { value: '', label: 'Não selecionado' },
  { value: 'EXCLUSIVE', label: 'Exclusivo' },
  { value: 'OPEN', label: 'Aberto' },
  { value: 'AUTHORIZATION', label: 'Autorização' },
]

const PRICE_TYPE_OPTIONS = [
  { value: '', label: 'Não selecionado' },
  { value: 'FIXED', label: 'Valor fixo' },
  { value: 'ON_REQUEST', label: 'Sob consulta' },
  { value: 'NEGOTIABLE', label: 'Negociável' },
]

const PROPERTY_TYPES = [
  'Apartamento', 'Casa', 'Sobrado', 'Terreno', 'Sala Comercial', 'Loja',
  'Galpão', 'Prédio', 'Chácara', 'Fazenda', 'Studio', 'Kitnet',
  'Cobertura', 'Flat', 'Mansão', 'Sítio', 'Casa em Condomínio',
  'Área Industrial', 'Hotel/Pousada', 'Consultório', 'Escritório',
].map(v => ({ value: v, label: v }))

const CONDITION_OPTIONS = [
  { value: '', label: 'Não selecionado' },
  { value: 'Novo', label: 'Novo' },
  { value: 'Usado', label: 'Usado' },
  { value: 'Em construção', label: 'Em construção' },
  { value: 'Na planta', label: 'Na planta' },
]

const FLOOR_OPTIONS = [
  { value: '', label: 'Não selecionado' },
  ...Array.from({ length: 50 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}º andar` })),
  { value: 'Térreo', label: 'Térreo' },
  { value: 'Subsolo', label: 'Subsolo' },
  { value: 'Cobertura', label: 'Cobertura' },
]

const PERIOD_OPTIONS = [
  { value: '', label: 'Não selecionado' },
  { value: 'Mensal', label: 'Mensal' },
  { value: 'Anual', label: 'Anual' },
]

const PARKING_TYPES = [
  { value: '', label: 'Tipo' },
  { value: 'Coberta', label: 'Coberta' },
  { value: 'Descoberta', label: 'Descoberta' },
  { value: 'Box', label: 'Box' },
  { value: 'Rotativa', label: 'Rotativa' },
]

const REGIONS = [
  { value: '', label: 'Não selecionado' },
  { value: 'Norte', label: 'Norte' },
  { value: 'Nordeste', label: 'Nordeste' },
  { value: 'Centro-Oeste', label: 'Centro-Oeste' },
  { value: 'Sudeste', label: 'Sudeste' },
  { value: 'Sul', label: 'Sul' },
]

const STATES = [
  { value: '', label: 'Selecione o estado' },
  ...['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
    .map(s => ({ value: s, label: s }))
]

const FEATURES = [
  { value: 'POOL', label: 'Piscina' },
  { value: 'GARDEN', label: 'Jardim' },
  { value: 'GARAGE', label: 'Garagem' },
  { value: 'ACCEPTS_PETS', label: 'Aceita Pets' },
  { value: 'INDIVIDUAL_GAS_METER', label: 'Gás Individual' },
  { value: 'JACUZZI', label: 'Jacuzzi' },
  { value: 'SOLAR_HEATING', label: 'Aquecimento Solar' },
  { value: 'WHEELCHAIR_ACCESSIBLE', label: 'Acessível PCD' },
  { value: 'GOURMET_BALCONY', label: 'Varanda Gourmet' },
  { value: 'BARBECUE', label: 'Churrasqueira' },
  { value: 'ELEVATOR', label: 'Elevador' },
  { value: 'GYM', label: 'Academia' },
  { value: 'PARTY_ROOM', label: 'Salão de Festas' },
  { value: 'PLAYGROUND', label: 'Playground' },
  { value: 'SAUNA', label: 'Sauna' },
  { value: 'SECURITY_24H', label: 'Segurança 24h' },
  { value: 'INTERCOM', label: 'Interfone' },
  { value: 'ALARM', label: 'Alarme' },
  { value: 'GENERATOR', label: 'Gerador' },
  { value: 'FURNISHED', label: 'Mobiliado' },
  { value: 'SEMI_FURNISHED', label: 'Semi-Mobiliado' },
  { value: 'AIR_CONDITIONING', label: 'Ar Condicionado' },
  { value: 'WOOD_FLOOR', label: 'Piso de Madeira' },
  { value: 'CERAMIC_FLOOR', label: 'Piso Cerâmica' },
  { value: 'MARBLE_FLOOR', label: 'Piso Mármore' },
]

const LIFESTYLES = [
  { value: 'RETIREMENT', label: 'Aposentadoria' },
  { value: 'BEACH', label: 'Beira Mar' },
  { value: 'HOT_CLIMATE', label: 'Clima Quente' },
  { value: 'WATER_SPRING', label: "Fonte d'Água" },
  { value: 'GOLF', label: 'Golfo' },
  { value: 'COUNTRYSIDE', label: 'Interior' },
  { value: 'INVESTMENT', label: 'Investimento' },
  { value: 'METROPOLIS', label: 'Metrópole' },
  { value: 'RANCH', label: 'Rancho e Fazenda' },
  { value: 'SKI_RESORT', label: 'Ski e Resort' },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-[#1e3a8a] uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">
      {children}
    </h3>
  )
}

function FieldRow({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={cn('grid gap-4', {
      'grid-cols-1': cols === 1,
      'grid-cols-1 md:grid-cols-2': cols === 2,
      'grid-cols-1 md:grid-cols-3': cols === 3,
      'grid-cols-1 md:grid-cols-4': cols === 4,
    })}>
      {children}
    </div>
  )
}

interface EmpreendimentoOption { id: string; name: string }
interface UnitOption { id: string; floor: number; number: string; block: { id: string; name: string }; unitType: { name: string } | null; properties: Array<{ id: string; ref: string; status: string }> }

export function TabPrincipal({ data, onChange }: TabPrincipalProps) {
  const features = (data.features as string[]) ?? []
  const lifestyles = (data.lifestyles as string[]) ?? []
  const additionalFees = (data.additionalFees as AdditionalFee[]) ?? []
  const parkingSpots = (data.parkingSpots as ParkingSpotRow[]) ?? [{ quantity: '', type: '' }]
  const rooms = (data.rooms as RoomRow[]) ?? []
  const [showAllFeatures, setShowAllFeatures] = useState(false)
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoOption[]>([])
  const [units, setUnits] = useState<UnitOption[]>([])
  const empreendimentoId = (data.empreendimentoId as string) ?? ''

  useEffect(() => {
    fetch('/api/empreendimentos?admin=true&limit=100')
      .then(r => r.json())
      .then(d => setEmpreendimentos(d.empreendimentos ?? []))
      .catch(() => {})
  }, [])

  // v1.2: unidades do empreendimento escolhido (bloco / andar / número)
  useEffect(() => {
    if (!empreendimentoId) { setUnits([]); return }
    fetch(`/api/empreendimentos/${empreendimentoId}/unidades`)
      .then(r => r.json())
      .then(d => setUnits(d.units ?? []))
      .catch(() => setUnits([]))
  }, [empreendimentoId])

  const toggleFeature = (val: string) => {
    onChange('features', features.includes(val) ? features.filter(f => f !== val) : [...features, val])
  }

  const toggleLifestyle = (val: string) => {
    onChange('lifestyles', lifestyles.includes(val) ? lifestyles.filter(l => l !== val) : [...lifestyles, val])
  }

  const addFee = () => onChange('additionalFees', [...additionalFees, { name: '', value: '', period: '' }])
  const removeFee = (i: number) => onChange('additionalFees', additionalFees.filter((_, idx) => idx !== i))
  const updateFee = (i: number, field: string, val: string) => {
    const updated = [...additionalFees]
    updated[i] = { ...updated[i], [field]: val }
    onChange('additionalFees', updated)
  }

  const updateParking = (i: number, field: string, val: string) => {
    const updated = [...parkingSpots]
    updated[i] = { ...updated[i], [field]: val }
    onChange('parkingSpots', updated)
  }

  const addRoom = () => onChange('rooms', [...rooms, { name: '', area: '', description: '' }])
  const removeRoom = (i: number) => onChange('rooms', rooms.filter((_, idx) => idx !== i))
  const updateRoom = (i: number, field: string, val: string) => {
    const updated = [...rooms]
    updated[i] = { ...updated[i], [field]: val }
    onChange('rooms', updated)
  }

  // Autopreenchimento de endereço via ViaCEP
  const handleCepBlur = async () => {
    const cep = (data.zipCode as string ?? '').replace(/\D/g, '')
    if (cep.length !== 8) return
    try {
      const res = await fetch(`/api/cep?cep=${cep}`)
      if (!res.ok) return
      const d = await res.json()
      if (d.logradouro) onChange('address', d.logradouro)
      if (d.bairro) onChange('neighborhood', d.bairro)
      if (d.localidade) onChange('city', d.localidade)
      if (d.uf) onChange('state', d.uf)
    } catch { /* ignorar erros de rede */ }
  }

  const visibleFeatures = showAllFeatures ? FEATURES : FEATURES.slice(0, 8)

  return (
    <div className="space-y-8 py-4">

      {typeof data.sourceUrl === 'string' && data.sourceUrl && (
        <div className="p-4 rounded-xl bg-[#F0F4F8] border border-[#D6E2F0] text-sm text-[#1e3a8a]">
          Importado da RE/MAX
          {typeof data.importedAt === 'string' && ` em ${new Date(data.importedAt).toLocaleDateString('pt-BR')}`}
          {typeof data.sourceAgentName === 'string' && data.sourceAgentName && (
            <> · captação: <b>{data.sourceAgentName as string}</b>{typeof data.sourceOfficeName === 'string' && data.sourceOfficeName ? ` (${data.sourceOfficeName})` : ''}</>
          )}
          {' · '}
          <a href={data.sourceUrl as string} target="_blank" rel="noopener noreferrer" className="underline">ver anúncio original</a>
          <span className="block text-xs text-gray-500 mt-1">Para atualizar com os dados atuais da RE/MAX, importe o mesmo link de novo em Imóveis → Importar da RE/MAX.</span>
        </div>
      )}

      {/* ── Status e Datas ───────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Status e Datas</SectionTitle>
        <FieldRow cols={4}>
          <Select
            label="Status do Imóvel"
            id="status"
            value={(data.status as string) ?? 'DRAFT'}
            onChange={e => onChange('status', e.target.value)}
            options={STATUS_OPTIONS}
          />
          <Select
            label="Tipo do Contrato"
            id="contractType"
            value={(data.contractType as string) ?? ''}
            onChange={e => onChange('contractType', e.target.value)}
            options={CONTRACT_OPTIONS}
          />
          <Input
            label="Data de Cadastro"
            id="registrationDate"
            type="date"
            value={(data.registrationDate as string)?.slice(0, 10) ?? ''}
            onChange={e => onChange('registrationDate', e.target.value)}
          />
          <Input
            label="Data de Validade"
            id="expiryDate"
            type="date"
            value={(data.expiryDate as string)?.slice(0, 10) ?? ''}
            onChange={e => onChange('expiryDate', e.target.value)}
          />
        </FieldRow>
      </section>

      {/* ── Empreendimento ───────────────────────────────────────────────────── */}
      {empreendimentos.length > 0 && (
        <section>
          <SectionTitle>Empreendimento</SectionTitle>
          <FieldRow cols={2}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vinculado ao empreendimento</label>
              <select
                value={(data.empreendimentoId as string) ?? ''}
                onChange={e => { onChange('empreendimentoId', e.target.value || null); onChange('unitId', null) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              >
                <option value="">— Nenhum —</option>
                {empreendimentos.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            {empreendimentoId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade (bloco · apartamento)</label>
                <select
                  value={(data.unitId as string) ?? ''}
                  onChange={e => onChange('unitId', e.target.value || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                >
                  <option value="">— Sem unidade —</option>
                  {units.map(u => {
                    const other = u.properties[0] && u.properties[0].id !== (data.id as string)
                    return (
                      <option key={u.id} value={u.id}>
                        {u.block.name} · {u.number}{u.unitType ? ` · ${u.unitType.name}` : ''}{other ? ` (já anunciado: ${u.properties[0].ref})` : ''}
                      </option>
                    )
                  })}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  {units.length === 0 ? 'Este empreendimento ainda não tem a estrutura (blocos e unidades) cadastrada. Cadastre em Empreendimentos → Estrutura e unidades.' : 'Ao salvar, o anúncio aparece na página do prédio em “Unidades disponíveis” e herda a tipologia quando os campos estiverem vazios.'}
                </p>
              </div>
            )}
          </FieldRow>
        </section>
      )}

      {/* ── Preço e Custos Adicionais ────────────────────────────────────────── */}
      <section>
        <SectionTitle>Preço e Custos Adicionais</SectionTitle>
        <div className="space-y-4">
          <FieldRow cols={3}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Imóvel</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={(data.price as string) ?? ''}
                  onChange={e => onChange('price', e.target.value)}
                  placeholder="0,00"
                  aria-label="Valor do imóvel"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                />
              </div>
            </div>
            <Select
              label="Tipo de Valor"
              id="priceType"
              value={(data.priceType as string) ?? ''}
              onChange={e => onChange('priceType', e.target.value)}
              options={PRICE_TYPE_OPTIONS}
            />
            <div className="flex items-end gap-2">
              <Input
                label="Preço por m²"
                id="pricePerSqm"
                type="number"
                value={(data.pricePerSqm as string) ?? ''}
                onChange={e => onChange('pricePerSqm', e.target.value)}
                placeholder="0,00"
              />
              <label className="flex items-center gap-1.5 pb-2 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={(data.hidePrice as boolean) ?? false}
                  onChange={e => onChange('hidePrice', e.target.checked)}
                  className="accent-[#2563eb]"
                  aria-label="Ocultar preço no site"
                />
                <span className="text-xs text-gray-600">Ocultar</span>
              </label>
            </div>
          </FieldRow>
          <FieldRow cols={4}>
            <Input
              label="IPTU (R$)"
              id="iptu"
              type="number"
              value={(data.iptu as string) ?? ''}
              onChange={e => onChange('iptu', e.target.value)}
              placeholder="0,00"
            />
            <Select
              label="Período IPTU"
              id="iptuPeriod"
              value={(data.iptuPeriod as string) ?? ''}
              onChange={e => onChange('iptuPeriod', e.target.value)}
              options={PERIOD_OPTIONS}
            />
            <Input
              label="Condomínio (R$)"
              id="condominiumFee"
              type="number"
              value={(data.condominiumFee as string) ?? ''}
              onChange={e => onChange('condominiumFee', e.target.value)}
              placeholder="0,00"
            />
            <Select
              label="Periodicidade"
              id="condominiumFeePeriod"
              value={(data.condominiumFeePeriod as string) ?? ''}
              onChange={e => onChange('condominiumFeePeriod', e.target.value)}
              options={PERIOD_OPTIONS}
            />
          </FieldRow>

          {/* Taxas adicionais */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Taxas Adicionais</p>
            <div className="space-y-2">
              {additionalFees.map((fee, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Nome da taxa"
                    value={fee.name}
                    onChange={e => updateFee(i, 'name', e.target.value)}
                    aria-label="Nome da taxa"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  />
                  <input
                    type="number"
                    placeholder="Valor"
                    value={fee.value}
                    onChange={e => updateFee(i, 'value', e.target.value)}
                    aria-label="Valor da taxa"
                    className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  />
                  <select
                    value={fee.period}
                    onChange={e => updateFee(i, 'period', e.target.value)}
                    aria-label="Período da taxa"
                    className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  >
                    <option value="">Período</option>
                    <option value="Mensal">Mensal</option>
                    <option value="Anual">Anual</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeFee(i)}
                    aria-label="Remover taxa"
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addFee}
              className="mt-2 flex items-center gap-1.5 text-sm text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
            >
              <Plus size={16} /> Adicionar taxa adicional
            </button>
          </div>
        </div>
      </section>

      {/* ── Detalhes da Comissão ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Detalhes da Comissão</SectionTitle>
        <FieldRow cols={2}>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Comissão de Captação</p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="%"
                value={(data.captureCommissionPct as string) ?? ''}
                onChange={e => onChange('captureCommissionPct', e.target.value)}
                aria-label="Comissão de captação %"
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
              <div className="flex gap-3 text-sm">
                {['PERCENTAGE', 'AMOUNT'].map(v => (
                  <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="captureType"
                      value={v}
                      checked={(data.captureCommissionType as string) === v}
                      onChange={() => onChange('captureCommissionType', v)}
                      className="accent-[#2563eb]"
                      aria-label={v === 'PERCENTAGE' ? 'Porcentagem' : 'Montante'}
                    />
                    <span className="text-gray-600">{v === 'PERCENTAGE' ? 'Porcentagem' : 'Montante'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Comissão de Venda</p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="%"
                value={(data.saleCommissionPct as string) ?? ''}
                onChange={e => onChange('saleCommissionPct', e.target.value)}
                aria-label="Comissão de venda %"
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
              <div className="flex gap-3 text-sm">
                {['PERCENTAGE', 'AMOUNT'].map(v => (
                  <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="saleType"
                      value={v}
                      checked={(data.saleCommissionType as string) === v}
                      onChange={() => onChange('saleCommissionType', v)}
                      className="accent-[#2563eb]"
                      aria-label={v === 'PERCENTAGE' ? 'Porcentagem' : 'Montante'}
                    />
                    <span className="text-gray-600">{v === 'PERCENTAGE' ? 'Porcentagem' : 'Montante'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </FieldRow>
      </section>

      {/* ── Financeiro ───────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Financeiro</SectionTitle>
        <FieldRow cols={3}>
          <Input
            label="Nº Contrib. IPTU/ITR"
            id="iptuRegistration"
            value={(data.iptuRegistration as string) ?? ''}
            onChange={e => onChange('iptuRegistration', e.target.value)}
          />
          <Input
            label="Número do Registro"
            id="registryNumber"
            value={(data.registryNumber as string) ?? ''}
            onChange={e => onChange('registryNumber', e.target.value)}
          />
          <Input
            label="Notas Financeiras"
            id="financialNotes"
            value={(data.financialNotes as string) ?? ''}
            onChange={e => onChange('financialNotes', e.target.value)}
          />
        </FieldRow>
      </section>

      {/* ── Detalhes da Propriedade ──────────────────────────────────────────── */}
      <section>
        <SectionTitle>Detalhes da Propriedade</SectionTitle>
        <div className="space-y-4">
          <FieldRow cols={4}>
            <Select
              label="Tipo do Imóvel"
              id="propertyType"
              value={(data.propertyType as string) ?? ''}
              onChange={e => onChange('propertyType', e.target.value)}
              options={[{ value: '', label: 'Selecione...' }, ...PROPERTY_TYPES]}
            />
            <Select
              label="Condição"
              id="condition"
              value={(data.condition as string) ?? ''}
              onChange={e => onChange('condition', e.target.value)}
              options={CONDITION_OPTIONS}
            />
            <Input
              label="Ano de Construção"
              id="constructionYear"
              type="number"
              value={(data.constructionYear as string) ?? ''}
              onChange={e => onChange('constructionYear', e.target.value)}
              placeholder="2020"
            />
            <Input
              label="Mês de Construção"
              id="constructionMonth"
              type="number"
              min={1}
              max={12}
              value={(data.constructionMonth as string) ?? ''}
              onChange={e => onChange('constructionMonth', e.target.value)}
              placeholder="1 a 12"
            />
            <Input
              label="Data de Disponibilidade"
              id="availabilityDate"
              type="date"
              value={(data.availabilityDate as string)?.slice(0, 10) ?? ''}
              onChange={e => onChange('availabilityDate', e.target.value)}
            />
          </FieldRow>
          <FieldRow cols={4}>
            <Input
              label="Área Total (m²)"
              id="totalArea"
              type="number"
              value={(data.totalArea as string) ?? ''}
              onChange={e => onChange('totalArea', e.target.value)}
              placeholder="0"
            />
            <Input
              label="Área Útil (m²)"
              id="usefulArea"
              type="number"
              value={(data.usefulArea as string) ?? ''}
              onChange={e => onChange('usefulArea', e.target.value)}
              placeholder="0"
            />
            <Input
              label="Área do Terreno (m²)"
              id="landArea"
              type="number"
              value={(data.landArea as string) ?? ''}
              onChange={e => onChange('landArea', e.target.value)}
              placeholder="0"
            />
            <Input
              label="Volume Cúbico (m³)"
              id="cubicVolume"
              type="number"
              value={(data.cubicVolume as string) ?? ''}
              onChange={e => onChange('cubicVolume', e.target.value)}
              placeholder="0"
            />
          </FieldRow>
          <FieldRow cols={4}>
            <Input
              label="Nº Andares"
              id="floors"
              type="number"
              value={(data.floors as string) ?? ''}
              onChange={e => onChange('floors', e.target.value)}
              placeholder="0"
            />
            <Input
              label="Nº Aptos no Edifício"
              id="unitsInBuilding"
              type="number"
              value={(data.unitsInBuilding as string) ?? ''}
              onChange={e => onChange('unitsInBuilding', e.target.value)}
              placeholder="0"
            />
            <Input
              label="Vagas de Estacionamento"
              id="totalParkingSpots"
              type="number"
              value={(data.totalParkingSpots as string) ?? ''}
              onChange={e => onChange('totalParkingSpots', e.target.value)}
              placeholder="0"
            />
            <Input
              label="Ocupação Máxima"
              id="maxOccupancy"
              type="number"
              value={(data.maxOccupancy as string) ?? ''}
              onChange={e => onChange('maxOccupancy', e.target.value)}
              placeholder="0"
            />
          </FieldRow>

          {/* Vagas detalhadas por tipo */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Vagas (detalhe por tipo)</p>
            <div className="space-y-2">
              {parkingSpots.map((spot, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Qtd"
                    value={spot.quantity}
                    onChange={e => updateParking(i, 'quantity', e.target.value)}
                    aria-label={`Quantidade de vagas ${i + 1}`}
                    className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  />
                  <select
                    value={spot.type}
                    onChange={e => updateParking(i, 'type', e.target.value)}
                    aria-label={`Tipo de vaga ${i + 1}`}
                    className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  >
                    {PARKING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {parkingSpots.length < 3 && (
              <button
                type="button"
                onClick={() => onChange('parkingSpots', [...parkingSpots, { quantity: '', type: '' }])}
                className="mt-2 flex items-center gap-1.5 text-sm text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
              >
                <Plus size={16} /> Adicionar linha
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Ambientes ────────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Ambientes</SectionTitle>
        <div className="space-y-4">
          <FieldRow cols={4}>
            <Input
              label="Ambientes"
              id="environments"
              type="number"
              value={(data.environments as string) ?? '0'}
              onChange={e => onChange('environments', e.target.value)}
              placeholder="0"
            />
            <Input
              label="Dormitórios"
              id="bedrooms"
              type="number"
              value={(data.bedrooms as string) ?? '0'}
              onChange={e => onChange('bedrooms', e.target.value)}
              placeholder="0"
            />
            <Input
              label="Banheiros"
              id="bathrooms"
              type="number"
              value={(data.bathrooms as string) ?? '0'}
              onChange={e => onChange('bathrooms', e.target.value)}
              placeholder="0"
            />
            <Input
              label="Suítes"
              id="suites"
              type="number"
              value={(data.suites as string) ?? '0'}
              onChange={e => onChange('suites', e.target.value)}
              placeholder="0"
            />
            <Input
              label="Varandas"
              id="balconies"
              type="number"
              value={(data.balconies as string) ?? '0'}
              onChange={e => onChange('balconies', e.target.value)}
              placeholder="0"
            />
          </FieldRow>

          {/* Lista de ambientes detalhados */}
          <div>
            <div className="space-y-2">
              {rooms.map((room, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-start">
                  <input
                    type="text"
                    placeholder="Nome (ex: Sala de Estar)"
                    value={room.name}
                    onChange={e => updateRoom(i, 'name', e.target.value)}
                    aria-label={`Nome do ambiente ${i + 1}`}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  />
                  <input
                    type="number"
                    placeholder="Área (m²)"
                    value={room.area}
                    onChange={e => updateRoom(i, 'area', e.target.value)}
                    aria-label={`Área do ambiente ${i + 1}`}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Descrição"
                      value={room.description}
                      onChange={e => updateRoom(i, 'description', e.target.value)}
                      aria-label={`Descrição do ambiente ${i + 1}`}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    />
                    <button
                      type="button"
                      onClick={() => removeRoom(i)}
                      aria-label="Remover ambiente"
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRoom}
              className="mt-2 flex items-center gap-1.5 text-sm text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
            >
              <Plus size={16} /> Adicionar ambiente
            </button>
          </div>
        </div>
      </section>

      {/* ── Características do Imóvel ────────────────────────────────────────── */}
      <section>
        <SectionTitle>Características do Imóvel</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleFeatures.map((f) => (
            <label key={f.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={features.includes(f.value)}
                onChange={() => toggleFeature(f.value)}
                className="accent-[#2563eb] w-4 h-4"
                aria-label={f.label}
              />
              <span className="text-sm text-gray-700">{f.label}</span>
            </label>
          ))}
        </div>
        {FEATURES.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAllFeatures(!showAllFeatures)}
            className="mt-3 text-sm text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
          >
            {showAllFeatures ? 'Ver menos' : `Ver mais (${FEATURES.length - 8} características)`}
          </button>
        )}
        <div className="mt-4">
          <label htmlFor="extraFeatures" className="block text-sm font-medium text-gray-700 mb-1">
            Outras características (uma por linha)
          </label>
          <textarea
            id="extraFeatures"
            rows={5}
            value={Array.isArray(data.extraFeatures) ? (data.extraFeatures as string[]).join('\n') : ((data.extraFeatures as string) ?? '')}
            onChange={e => onChange('extraFeatures', e.target.value.split('\n'))}
            placeholder={'Perto do metrô\nArmário embutido\nPortaria com câmera'}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
          <p className="text-xs text-gray-400 mt-1">Aparecem no site junto com as marcadas acima. Os anúncios importados da RE/MAX já vêm preenchidos.</p>
        </div>
      </section>

      {/* ── Estilo de Vida ───────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Estilo de Vida</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {LIFESTYLES.map((l) => (
            <label key={l.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lifestyles.includes(l.value)}
                onChange={() => toggleLifestyle(l.value)}
                className="accent-[#2563eb] w-4 h-4"
                aria-label={l.label}
              />
              <span className="text-sm text-gray-700">{l.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* ── Localização do Imóvel ────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Localização do Imóvel</SectionTitle>
        <div className="space-y-4">
          <FieldRow cols={4}>
            <Input
              label="CEP"
              id="zipCode"
              value={(data.zipCode as string) ?? ''}
              onChange={e => onChange('zipCode', e.target.value)}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              hint="Digite o CEP para autopreenchimento"
            />
            <div className="md:col-span-2">
              <Input
                label="Endereço"
                id="address"
                value={(data.address as string) ?? ''}
                onChange={e => onChange('address', e.target.value)}
                placeholder="Rua, Avenida..."
              />
            </div>
            <Input
              label="Número"
              id="number"
              value={(data.number as string) ?? ''}
              onChange={e => onChange('number', e.target.value)}
              placeholder="123"
            />
          </FieldRow>
          <FieldRow cols={4}>
            <Input
              label="Complemento"
              id="complement"
              value={(data.complement as string) ?? ''}
              onChange={e => onChange('complement', e.target.value)}
              placeholder="Apto, Bloco..."
            />
            <Input
              label="Bairro"
              id="neighborhood"
              value={(data.neighborhood as string) ?? ''}
              onChange={e => onChange('neighborhood', e.target.value)}
            />
            <Input
              label="Cidade"
              id="city"
              value={(data.city as string) ?? ''}
              onChange={e => onChange('city', e.target.value)}
            />
            <Select
              label="Estado"
              id="state"
              value={(data.state as string) ?? ''}
              onChange={e => onChange('state', e.target.value)}
              options={STATES}
            />
          </FieldRow>
          <FieldRow cols={4}>
            <Select
              label="Região"
              id="region"
              value={(data.region as string) ?? ''}
              onChange={e => onChange('region', e.target.value)}
              options={REGIONS}
            />
            <Select
              label="Andar"
              id="floor"
              value={(data.floor as string) ?? ''}
              onChange={e => onChange('floor', e.target.value)}
              options={FLOOR_OPTIONS}
            />
            <Input
              label="Ponto de Referência"
              id="landmark"
              value={(data.landmark as string) ?? ''}
              onChange={e => onChange('landmark', e.target.value)}
              placeholder="Próximo ao..."
            />
            <Input
              label="Nº da Chave"
              id="keyNumber"
              value={(data.keyNumber as string) ?? ''}
              onChange={e => onChange('keyNumber', e.target.value)}
            />
          </FieldRow>
          {/* v1.3 — Viver aqui (pesquisa de região) */}
          {data.id ? (
            <div className="mt-4">
              <AreaInsightPanel kind="property" id={String(data.id)} insightId={(data.areaInsightId as string | null) ?? null}
                address={[data.address, data.number, data.neighborhood, data.city, data.state].filter(Boolean).join(', ')} />
            </div>
          ) : null}
          <FieldRow cols={2}>
            <Input
              label="Latitude"
              id="latitude"
              type="number"
              step="any"
              value={(data.latitude as string) ?? ''}
              onChange={e => onChange('latitude', e.target.value)}
              placeholder="-23.5505"
            />
            <Input
              label="Longitude"
              id="longitude"
              type="number"
              step="any"
              value={(data.longitude as string) ?? ''}
              onChange={e => onChange('longitude', e.target.value)}
              placeholder="-46.6333"
            />
          </FieldRow>

          {/* Placeholder do mapa Leaflet — renderizado após salvar endereço */}
          <div className="bg-gray-100 rounded-xl h-48 flex items-center justify-center border border-dashed border-gray-300">
            <p className="text-sm text-gray-400">
              Mapa interativo (Leaflet) — disponível após salvar o endereço
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={(data.showFullAddress as boolean) ?? false}
              onChange={e => onChange('showFullAddress', e.target.checked)}
              className="accent-[#2563eb] w-4 h-4"
              aria-label="Mostrar endereço completo no site"
            />
            <span className="text-sm text-gray-700">
              Mostrar endereço completo no site e portais
            </span>
          </label>
        </div>
      </section>

    </div>
  )
}
