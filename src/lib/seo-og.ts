import { getSiteConfigCached } from '@/lib/cache'
import { absUrl, SITE_URL } from '@/lib/site'

/**
 * v1.5 — Imagem de compartilhamento padrão do site (Configurações → SEO; sem ela, /og-default.jpg).
 * Quando uma página declara o próprio openGraph, o Next.js não herda a imagem do layout;
 * as páginas sem foto própria usam esta, para a prévia no WhatsApp nunca sair sem imagem.
 */
export async function defaultOgImages(alt = 'Paulo Pop — Corretor de Imóveis no DF') {
  const config = await getSiteConfigCached().catch(() => null)
  const url = absUrl(config?.ogImageUrl) ?? `${SITE_URL}/og-default.jpg`
  return [{ url, width: 1200, height: 630, alt }]
}
