'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

const PROPERTY_TYPES = [
  'Apartamento', 'Casa', 'Sobrado', 'Terreno', 'Sala Comercial', 'Loja',
  'Galpão', 'Prédio', 'Chácara', 'Fazenda', 'Studio', 'Kitnet',
  'Cobertura', 'Flat', 'Mansão', 'Sítio', 'Casa em Condomínio',
  'Área Industrial', 'Hotel/Pousada', 'Consultório', 'Escritório',
]

interface PropertyCreateModalProps {
  open: boolean
  onClose: () => void
}

export function PropertyCreateModal({ open, onClose }: PropertyCreateModalProps) {
  const router = useRouter()
  const [purpose, setPurpose] = useState<'RESIDENTIAL' | 'COMMERCIAL'>('RESIDENTIAL')
  const [transactionType, setTransactionType] = useState<'SALE' | 'RENT'>('SALE')
  const [propertyType, setPropertyType] = useState('')
  const [location, setLocation] = useState<'BRAZIL' | 'ABROAD'>('BRAZIL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!propertyType) {
      setError('Selecione o tipo de imóvel.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/imoveis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose, transactionType, propertyType, location }),
      })
      if (!res.ok) throw new Error('Erro ao criar imóvel')
      const data = await res.json()
      onClose()
      router.push(`/admin/imoveis/${data.id}`)
    } catch {
      setError('Ocorreu um erro. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cadastrar Imóvel" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Finalidade */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">
            Finalidade do Imóvel
          </legend>
          <div className="flex gap-4">
            {[
              { value: 'RESIDENTIAL', label: 'Residencial' },
              { value: 'COMMERCIAL', label: 'Comercial' },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="purpose"
                  value={opt.value}
                  checked={purpose === opt.value}
                  onChange={() => setPurpose(opt.value as 'RESIDENTIAL' | 'COMMERCIAL')}
                  className="accent-[#2563eb] w-4 h-4"
                  aria-label={opt.label}
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Transação */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">
            Tipo de Transação
          </legend>
          <div className="flex gap-4">
            {[
              { value: 'SALE', label: 'Para Venda' },
              { value: 'RENT', label: 'Para Alugar' },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="transactionType"
                  value={opt.value}
                  checked={transactionType === opt.value}
                  onChange={() => setTransactionType(opt.value as 'SALE' | 'RENT')}
                  className="accent-[#2563eb] w-4 h-4"
                  aria-label={opt.label}
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Tipo de Imóvel */}
        <div>
          <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Imóvel <span className="text-red-500">*</span>
          </label>
          <select
            id="propertyType"
            value={propertyType}
            onChange={(e) => { setPropertyType(e.target.value); setError('') }}
            required
            aria-label="Tipo de imóvel"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent hover:border-gray-400 transition-colors"
          >
            <option value="">Selecione o tipo...</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        {/* Localização */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">
            Localização do Imóvel
          </legend>
          <div className="flex gap-4">
            {[
              { value: 'BRAZIL', label: 'Imóvel no Brasil' },
              { value: 'ABROAD', label: 'Imóvel no Exterior' },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="location"
                  value={opt.value}
                  checked={location === opt.value}
                  onChange={() => setLocation(opt.value as 'BRAZIL' | 'ABROAD')}
                  className="accent-[#2563eb] w-4 h-4"
                  aria-label={opt.label}
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Salvar e Continuar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
