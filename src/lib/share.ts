/**
 * v1.3 — compartilhar (Web Share API) com fallback para copiar o link.
 * Devolve 'shared' | 'copied' | 'failed'.
 */
export async function shareLink(opts: { url: string; title?: string; text?: string }): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ url: opts.url, title: opts.title, text: opts.text })
      return 'shared'
    }
  } catch (e) {
    // usuário cancelou → não tentar copiar
    if (e instanceof Error && e.name === 'AbortError') return 'failed'
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(opts.url)
      return 'copied'
    }
  } catch { /* segue para o fallback */ }
  try {
    const el = document.createElement('textarea')
    el.value = opts.url
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok ? 'copied' : 'failed'
  } catch {
    return 'failed'
  }
}

/** Link do WhatsApp (55 + DDD + número). */
export function waHref(phone: string | null | undefined, text?: string): string | null {
  const d = String(phone ?? '').replace(/\D/g, '')
  if (!d) return null
  const full = d.length <= 11 ? `55${d}` : d
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
