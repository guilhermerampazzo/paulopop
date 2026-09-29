'use client'

interface Portal {
  portalName: string
  active: boolean
  externalId?: string
  publishedAt?: string
}

interface TabPortaisProps {
  portals: Portal[]
  onPortalsChange: (portals: Portal[]) => void
}

const AVAILABLE_PORTALS = [
  { name: 'ZAP Imóveis', logo: '🏠' },
  { name: 'VivaReal', logo: '🏡' },
  { name: 'OLX', logo: '📋' },
  { name: 'Imovelweb', logo: '🌐' },
  { name: 'Chaves na Mão', logo: '🔑' },
  { name: 'Viva o Lar', logo: '🏘️' },
]

export function TabPortais({ portals, onPortalsChange }: TabPortaisProps) {
  const getPortal = (name: string) =>
    portals.find(p => p.portalName === name) ?? { portalName: name, active: false }

  const toggle = (name: string) => {
    const current = portals.find(p => p.portalName === name)
    if (current) {
      onPortalsChange(portals.map(p => p.portalName === name ? { ...p, active: !p.active } : p))
    } else {
      onPortalsChange([...portals, { portalName: name, active: true }])
    }
  }

  return (
    <div className="py-4">
      <p className="text-sm text-gray-500 mb-6">
        Selecione os portais onde este imóvel será publicado.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AVAILABLE_PORTALS.map(({ name, logo }) => {
          const portal = getPortal(name)
          return (
            <div
              key={name}
              className={`border-2 rounded-xl p-4 transition-all ${
                portal.active ? 'border-[#2563eb] bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{logo}</span>
                  <span className="font-medium text-gray-700">{name}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={portal.active}
                  aria-label={`${portal.active ? 'Desativar' : 'Ativar'} ${name}`}
                  onClick={() => toggle(name)}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-1 ${
                    portal.active ? 'bg-[#2563eb]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 bg-white rounded-full shadow transform transition-transform mt-1 ${
                      portal.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {portal.active && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="ID externo (opcional)"
                    defaultValue={portal.externalId ?? ''}
                    aria-label={`ID externo ${name}`}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                    onBlur={e => {
                      onPortalsChange(
                        portals.map(p =>
                          p.portalName === name ? { ...p, externalId: e.target.value } : p
                        )
                      )
                    }}
                  />
                  {portal.publishedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Publicado em {new Date(portal.publishedAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
