'use client'

import { useState } from 'react'
import { Megaphone, Search } from 'lucide-react'
import { MarketingPlanModal } from '@/components/admin/MarketingPlanModal'
import { Button } from '@/components/ui/Button'

interface MarketingProperty {
  id: string
  ref: string
  title: string | null
  propertyType: string | null
  city: string | null
  state: string | null
}

interface MarketingAdminClientProps {
  properties: MarketingProperty[]
}

export function MarketingAdminClient({ properties }: MarketingAdminClientProps) {
  const [selectedProperty, setSelectedProperty] = useState<MarketingProperty | null>(null)

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0F4F8]">
              <Megaphone className="h-5 w-5 text-[#2563eb]" />
            </div>
            <div>
              <h2 className="font-semibold text-[#1e3a8a]">Planos de marketing</h2>
              <p className="text-sm text-gray-500">
                Gere um plano de divulgação com IA para qualquer imóvel cadastrado.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-5 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-[#1e3a8a]">Imóveis disponíveis para marketing</h3>
              <p className="text-sm text-gray-500">Escolha um imóvel para criar ou regenerar o plano.</p>
            </div>
            <span className="text-sm font-medium text-[#2563eb]">{properties.length} {properties.length === 1 ? 'imóvel' : 'imóveis'}</span>
          </div>

          {properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <Search className="h-10 w-10 text-gray-300" />
              <p className="font-medium text-gray-600">Nenhum imóvel cadastrado ainda.</p>
              <p className="max-w-md text-sm text-gray-400">
                Assim que houver imóveis no sistema, eles vão aparecer aqui para gerar campanhas e planos de divulgação.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {properties.map(property => (
                <div key={property.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-mono text-gray-400">{property.ref}</p>
                    <h4 className="mt-1 font-medium text-[#1e3a8a]">
                      {property.title ?? property.propertyType ?? 'Imóvel sem título'}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      {property.propertyType ?? 'Tipo não informado'}
                      {property.city ? ` • ${property.city}` : ''}
                      {property.state ? `, ${property.state}` : ''}
                    </p>
                  </div>

                  <Button
                    onClick={() => setSelectedProperty(property)}
                    aria-label={`Gerar plano de marketing para ${property.title ?? property.ref}`}
                  >
                    <Megaphone size={16} />
                    Gerar plano
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedProperty && (
        <MarketingPlanModal
          propertyId={selectedProperty.id}
          propertyTitle={selectedProperty.title ?? selectedProperty.propertyType ?? selectedProperty.ref}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </>
  )
}
