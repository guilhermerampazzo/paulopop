'use client'

/**
 * v1.1 — Rastreamento configurado no painel (Configurações → Rastreamento).
 * Carrega GA4, Meta Pixel e/ou GTM só quando o ID existe, e nunca dentro de /admin.
 * Eventos: view_item (página do imóvel), generate_lead (formulário), whatsapp_click, search.
 */
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

interface AnalyticsProps {
  ga4Id?: string | null
  pixelId?: string | null
  gtmId?: string | null
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

const ID_OK = /^[A-Za-z0-9_-]{4,40}$/

export function Analytics({ ga4Id, pixelId, gtmId }: AnalyticsProps) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')
  const ga = ga4Id && ID_OK.test(ga4Id) ? ga4Id : null
  const px = pixelId && /^\d{5,20}$/.test(pixelId) ? pixelId : null
  const gtm = gtmId && ID_OK.test(gtmId) ? gtmId : null

  // page_view nas trocas de rota (App Router não recarrega a página)
  useEffect(() => {
    if (isAdmin || !pathname) return
    if (ga && window.gtag) window.gtag('event', 'page_view', { page_path: pathname })
    if (px && window.fbq) window.fbq('track', 'PageView')
  }, [pathname, isAdmin, ga, px])

  // Clique em qualquer link do WhatsApp vira o evento whatsapp_click (sem mexer em cada botão)
  useEffect(() => {
    if (isAdmin) return
    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a) return
      if (/wa\.me|api\.whatsapp\.com|whatsapp:\/\//i.test(a.href)) {
        trackEvent('whatsapp_click', { page_path: window.location.pathname, link_text: (a.textContent ?? '').trim().slice(0, 60) })
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [isAdmin])

  if (isAdmin || (!ga && !px && !gtm)) return null

  return (
    <>
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga}',{send_page_view:true});`}
          </Script>
        </>
      )}
      {px && (
        <>
          <Script id="meta-pixel-init" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${px}');fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img height="1" width="1" style={{ display: 'none' }} alt="" src={`https://www.facebook.com/tr?id=${px}&ev=PageView&noscript=1`} />
          </noscript>
        </>
      )}
      {gtm && (
        <>
          <Script id="gtm-init" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
          </Script>
          <noscript>
            <iframe src={`https://www.googletagmanager.com/ns.html?id=${gtm}`} height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} title="gtm" />
          </noscript>
        </>
      )}
    </>
  )
}

/** Dispara um evento para GA4, Pixel e dataLayer (GTM). Seguro quando nada está carregado. */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  try {
    window.gtag?.('event', name, params)
    window.dataLayer?.push({ event: name, ...params })
    if (window.fbq) {
      const map: Record<string, string> = { generate_lead: 'Lead', view_item: 'ViewContent', search: 'Search', whatsapp_click: 'Contact' }
      const std = map[name]
      if (std) window.fbq('track', std, params)
      else window.fbq('trackCustom', name, params)
    }
  } catch {
    // rastreamento nunca pode quebrar a página
  }
}
