'use client'

import { usePathname } from 'next/navigation'
import { Header } from './Header'
import { Footer } from './Footer'
import { WhatsAppButton } from './WhatsAppButton'
import { MobileActionBar } from './MobileActionBar'

interface PublicShellProps {
  children: React.ReactNode
  ownerName?: string
  ownerCompany?: string
  whatsapp?: string
  whatsappMessage?: string
  /** v1.3: telefone para o botão "Ligar" da barra do celular (cai no WhatsApp se ausente) */
  phone?: string | null
  cities?: string[]
  logoUrl?: string | null
  /** v1.3: páginas de cidade publicadas para o rodapé */
  cityPages?: Array<{ slug: string; name: string }>
}

export function PublicShell({
  children,
  ownerName,
  ownerCompany,
  whatsapp,
  whatsappMessage,
  phone,
  cities,
  logoUrl,
  cityPages,
}: PublicShellProps) {
  const pathname = usePathname()
  // v1.2: /estudo/[token] é um documento limpo (sem cabeçalho/rodapé), próprio para impressão em PDF
  // v1.4: /imoveis/[slug]/imprimir é a ficha completa do imóvel, também sem cabeçalho/rodapé
  const isBare = pathname.startsWith('/admin') || pathname.startsWith('/estudo/') || /^\/imoveis\/[^/]+\/imprimir\/?$/.test(pathname)

  if (isBare) return <>{children}</>

  return (
    <>
      <Header logoUrl={logoUrl} />
      {/* v1.3: espaço para a barra fixa inferior no celular */}
      <div className="pb-16 md:pb-0">
        <main id="main-content">{children}</main>
        <Footer ownerName={ownerName} ownerCompany={ownerCompany ?? undefined} cities={cities} cityPages={cityPages} />
      </div>
      {whatsapp && (
        <WhatsAppButton phone={whatsapp} message={whatsappMessage} />
      )}
      <MobileActionBar whatsapp={whatsapp ?? null} phone={phone ?? whatsapp ?? null} message={whatsappMessage} />
    </>
  )
}
