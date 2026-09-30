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

/**
 * v1.4 — compartilhar o imóvel com a foto principal junto do link.
 * Onde o aparelho aceita arquivos na Web Share API (celulares e Chrome/Edge no Windows), a foto vai
 * como anexo e o link segue no texto; nos demais, cai em shareLink (o link leva a foto na prévia,
 * pela metatag og:image do imóvel).
 */
export async function shareProperty(opts: { url: string; title?: string; text?: string; imageUrl?: string | null }): Promise<'shared' | 'copied' | 'failed'> {
  if (opts.imageUrl && typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
    try {
      const res = await fetch(opts.imageUrl, { cache: 'force-cache' })
      if (res.ok) {
        const blob = await res.blob()
        if (blob.type.startsWith('image/') && blob.size > 0 && blob.size < 8 * 1024 * 1024) {
          const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
          const file = new File([blob], `imovel.${ext}`, { type: blob.type })
          const data = { files: [file], title: opts.title, text: [opts.text ?? opts.title, opts.url].filter(Boolean).join('\n') }
          if (navigator.canShare(data)) {
            await navigator.share(data)
            return 'shared'
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'failed'
      // qualquer outra falha (rede, tipo não aceito) → compartilha só o link
    }
  }
  return shareLink(opts)
}

/** Link do WhatsApp (55 + DDD + número). */
export function waHref(phone: string | null | undefined, text?: string): string | null {
  const d = String(phone ?? '').replace(/\D/g, '')
  if (!d) return null
  const full = d.length <= 11 ? `55${d}` : d
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
