/**
 * v1.5 — Título de página limpo para o Google e para a prévia do WhatsApp.
 *
 * O layout acrescenta " | Paulo Pop" a todo título (template). Quando o título
 * gravado no imóvel já termina com "| Paulo Pop" (ou "- Paulo Pop Imóveis"…),
 * o sufixo saía duas vezes. Aqui o sufixo gravado é retirado (quantas vezes
 * aparecer) e o texto é encurtado numa palavra inteira, para o título final
 * (com o sufixo) caber nos ~65 caracteres que o Google mostra.
 */

const BRAND_SUFFIX = /\s*[|\-–—·]\s*Paulo\s*Pop(\s+(Im[óo]veis|Corretor(\s+de\s+Im[óo]veis)?))?\s*$/i

export const TITLE_SUFFIX = ' | Paulo Pop'

/** Remove o sufixo da marca do fim do texto, mesmo repetido. */
export function stripBrandSuffix(title: string): string {
  let t = title.trim()
  let prev = ''
  while (t !== prev) {
    prev = t
    t = t.replace(BRAND_SUFFIX, '').trim()
  }
  return t
}

/**
 * Título sem o sufixo da marca e com no máximo `max` caracteres, cortado no fim
 * de uma palavra (sem reticências; pontuação solta no fim é retirada).
 */
export function cleanPageTitle(title: string, max = 52): string {
  const t = stripBrandSuffix(title).replace(/\s+/g, ' ')
  if (t.length <= max) return t
  const cut = t.slice(0, max + 1)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : t.slice(0, max)
  return base.replace(/[\s,;:|\-–—·]+$/, '')
}
