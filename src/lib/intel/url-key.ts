/**
 * v1.4 — chave de um anúncio no banco de amostras: host + caminho, sem "www", sem parâmetros de rastreio
 * e sem barra final. O mesmo anúncio colado duas vezes (com ?utm=… ou #foto) vira o mesmo registro.
 */
export function normalizeListingUrl(raw: string): { url: string; urlKey: string; host: string } | null {
  let u: URL
  try { u = new URL(String(raw).trim()) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '')
  if (!host.includes('.')) return null
  // um "%" solto no endereço não pode derrubar a leitura
  let decoded = u.pathname
  try { decoded = decodeURIComponent(u.pathname) } catch { /* mantém como veio */ }
  const path = decoded.replace(/\/+$/, '') || '/'
  // poucos portais identificam o anúncio por parâmetro; mantemos só os que parecem identificadores
  const keep: string[] = []
  u.searchParams.forEach((v, k) => { if (/(^|[_-])(id|codigo|cod|ref|imovel|anuncio|listing)([_-]|$)/i.test(k) && v) keep.push(`${k.toLowerCase()}=${v}`) })
  const query = keep.length ? `?${keep.sort().join('&')}` : ''
  return { url: `https://${u.hostname}${u.pathname}${u.search}`, urlKey: `${host}${path.toLowerCase()}${query}`, host }
}

/** Código do anúncio: o número longo no fim do endereço (padrão dos portais); sem ele, o último número longo do trecho final. */
export function externalIdFromUrl(raw: string): string | null {
  try {
    const last = new URL(raw).pathname.replace(/\/+$/, '').split('/').pop() ?? ''
    const end = last.match(/(\d{5,})(?:\.html?)?$/)
    if (end) return end[1]
    const all = last.match(/\d{6,}/g)
    return all ? all[all.length - 1] : null
  } catch { return null }
}
