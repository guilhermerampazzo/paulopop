/**
 * v1.1 — domínio oficial do site e helpers de URL.
 * NEXT_PUBLIC_SITE_URL vale em produção; o padrão é o domínio real (nunca localhost nas metatags).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !/localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_SITE_URL)
  ? process.env.NEXT_PUBLIC_SITE_URL
  : 'https://corretorpaulopop.com').replace(/\/+$/, '')

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Paulo Pop'

/** URL absoluta a partir de um caminho ou URL (troca localhost pelo domínio real). */
export function absUrl(pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl) return undefined
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, SITE_URL)
  }
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}
