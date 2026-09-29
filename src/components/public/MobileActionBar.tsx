'use client'

/**
 * v1.3 — Barra fixa inferior no celular (WhatsApp / Ligar / Buscar) para todas as páginas públicas.
 * Não aparece em /admin, /estudo nem na página do imóvel (que tem barra própria — `data-has-own-bar`).
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MessageCircle, Phone, Search } from 'lucide-react'
import { waHref } from '@/lib/share'

interface Props { whatsapp?: string | null; phone?: string | null; message?: string }

export function MobileActionBar({ whatsapp, phone, message }: Props) {
  const pathname = usePathname()
  const [hidden, setHidden] = useState(false)

  const isPropertyPage = /^\/imoveis\/[^/]+\/?$/.test(pathname)
  const isBare = pathname.startsWith('/admin') || pathname.startsWith('/estudo')

  useEffect(() => {
    // alguma página montou a própria barra (ex.: página do imóvel)?
    const check = () => setHidden(!!document.querySelector('[data-has-own-bar]'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.body, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [pathname])

  if (isBare || isPropertyPage || hidden) return null

  const wa = waHref(whatsapp, message)
  const tel = phone ? `tel:+${(phone.replace(/\D/g, '').length <= 11 ? '55' : '') + phone.replace(/\D/g, '')}` : null

  return (
    <nav aria-label="Ações rápidas" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 print:hidden" data-mobile-action-bar>
      <ul className="grid grid-cols-3 text-xs font-semibold text-[#1e3a8a]">
        <li>
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-0.5 py-2.5">
              <MessageCircle className="w-5 h-5 text-[#25D366]" /> WhatsApp
            </a>
          ) : (
            <Link href="/contato" className="flex flex-col items-center gap-0.5 py-2.5"><MessageCircle className="w-5 h-5 text-[#25D366]" /> Contato</Link>
          )}
        </li>
        <li>
          {tel ? (
            <a href={tel} className="flex flex-col items-center gap-0.5 py-2.5 border-x border-gray-100"><Phone className="w-5 h-5" /> Ligar</a>
          ) : (
            <Link href="/contato" className="flex flex-col items-center gap-0.5 py-2.5 border-x border-gray-100"><Phone className="w-5 h-5" /> Contato</Link>
          )}
        </li>
        <li>
          <Link href="/imoveis" className="flex flex-col items-center gap-0.5 py-2.5"><Search className="w-5 h-5" /> Buscar</Link>
        </li>
      </ul>
    </nav>
  )
}
