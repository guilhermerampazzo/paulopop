export const dynamic = 'force-dynamic'

import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = { themeColor: '#1e3a8a', width: 'device-width', initialScale: 1 }
// v1.1: fonte Inter servida pelo próprio site (pacote npm), como no AcademyPop; sem Google Fonts no build
import '@fontsource-variable/inter'
import './globals.css'
import { Providers } from './providers'
import { PublicShell } from '@/components/public/PublicShell'
import { getSiteConfigCached, getActiveCitiesCached } from '@/lib/cache'
import { getPublishedCityLinksCached } from '@/lib/city-pages'
import { SITE_URL, absUrl } from '@/lib/site'
import { Analytics } from '@/components/public/Analytics'

const DEFAULT_TITLE = 'Paulo Pop | Corretor de Imóveis no DF'
const DEFAULT_DESCRIPTION = 'Corretor de imóveis no DF. Compra, venda e aluguel em Samambaia, Águas Claras, Taguatinga e região. Consultoria personalizada com Paulo Pop — CRECI 12896/DF.'

// v1.1: metadataBase com o domínio real (og:image deixa de apontar para localhost),
// título e descrição do painel aplicados na home e imagem de compartilhamento padrão.
export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfigCached().catch(() => null)
  const ogImage = absUrl(config?.ogImageUrl) ?? `${SITE_URL}/og-default.jpg`
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: config?.metaTitle || DEFAULT_TITLE,
      template: '%s | Paulo Pop',
    },
    description: config?.metaDescription || DEFAULT_DESCRIPTION,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      siteName: 'Paulo Pop Imóveis',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', images: [ogImage] },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // v1.1: configuração e cidades em cache de 60 s (renovado ao salvar no painel)
  // v1.3: páginas de cidade publicadas (rodapé "Cidades do DF")
  const [config, cities, cityPages] = await Promise.all([getSiteConfigCached(), getActiveCitiesCached(), getPublishedCityLinksCached().catch(() => [])])

  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased bg-white text-gray-900">
        {/* v1.1: GA4, Meta Pixel e GTM configurados no painel (Configurações → Rastreamento) */}
        <Analytics
          ga4Id={config?.ga4Id ?? process.env.NEXT_PUBLIC_GA4_ID ?? null}
          pixelId={config?.metaPixelId ?? process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null}
          gtmId={config?.gtmId ?? process.env.NEXT_PUBLIC_GTM_ID ?? null}
        />
        <Providers>
          {/* Skip link — acessibilidade (5.3) */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#1e3a8a] focus:text-white focus:rounded-lg focus:font-medium focus:text-sm"
          >
            Ir para o conteúdo principal
          </a>
          <PublicShell
            ownerName={config?.ownerName ?? 'Paulo Pop'}
            ownerCompany={config?.ownerCompany ?? undefined}
            whatsapp={config?.ownerWhatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP}
            whatsappMessage={config?.whatsappMessage ?? 'Olá! Tenho interesse em um imóvel.'}
            cities={cities}
            logoUrl={config?.logoUrl ?? null}
            phone={config?.ownerPhone ?? null}
            cityPages={cityPages.slice(0, 8)}
          >
            {children}
          </PublicShell>
        </Providers>
      </body>
    </html>
  )
}
