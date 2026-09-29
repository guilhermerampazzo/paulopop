import type { MetadataRoute } from 'next'

/**
 * v1.3 — PWA: gera /manifest.webmanifest (Next Metadata API). Sem service worker.
 * O `<link rel="manifest">` é injetado automaticamente pelo Next; `themeColor` deve entrar no
 * `viewport` de src/app/layout.tsx (não editado aqui).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Paulo Pop Imóveis',
    short_name: 'Paulo Pop',
    description: 'Corretor de imóveis RE/MAX no DF: apartamentos, casas e empreendimentos em Samambaia, Taguatinga e Águas Claras.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1e3a8a',
    lang: 'pt-BR',
    orientation: 'portrait',
    categories: ['business', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Buscar imóveis', url: '/imoveis', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Quero vender', url: '/vender', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
