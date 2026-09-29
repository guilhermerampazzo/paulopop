/**
 * Sanitização de HTML sem dependências externas.
 * v1.1: lista de tags e atributos permitidos (o editor do blog grava <a>, <img>, tabelas etc.),
 * remoção de scripts, estilos, eventos on*, javascript: e data: em links,
 * mais escapeHtml para textos que entram em e-mails.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'span', 'div',
  'a', 'img', 'figure', 'figcaption', 'hr', 'pre', 'code',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  '*': new Set(['class', 'style', 'title', 'id']),
  a: new Set(['href', 'target', 'rel', 'name']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  td: new Set(['colspan', 'rowspan']),
  ol: new Set(['start', 'type']),
}

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i
const SAFE_STYLE = /^(text-align|width|height|max-width|color|background-color|font-weight|font-style|text-decoration)\s*:/i

function cleanAttrs(tag: string, attrs: string): string {
  const allowed = ALLOWED_ATTRS[tag]
  const out: string[] = []
  const re = /([a-zA-Z][\w:-]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(attrs))) {
    const name = m[1].toLowerCase()
    const value = m[3] ?? m[4] ?? m[5] ?? ''
    if (name.startsWith('on')) continue
    if (!(ALLOWED_ATTRS['*'].has(name) || allowed?.has(name))) continue
    if ((name === 'href' || name === 'src') && !SAFE_URL.test(value.trim())) continue
    if (name === 'style') {
      const decls = value.split(';').map(d => d.trim()).filter(d => d && SAFE_STYLE.test(d) && !/url\(|expression\(/i.test(d))
      if (!decls.length) continue
      out.push(`style="${decls.join('; ').replace(/"/g, '')}"`)
      continue
    }
    const v = value.replace(/"/g, '&quot;')
    out.push(m[2] === undefined ? name : `${name}="${v}"`)
  }
  if (tag === 'a' && out.some(a => a.startsWith('target='))) {
    if (!out.some(a => a.startsWith('rel='))) out.push('rel="noopener noreferrer"')
  }
  return out.length ? ' ' + out.join(' ') : ''
}

/**
 * Remove todas as tags HTML — retorna apenas texto puro.
 * Usar quando o campo NÃO deve aceitar HTML.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim()
}

/**
 * Sanitiza HTML permitindo apenas tags e atributos seguros.
 */
export function sanitizeHtml(input: string): string {
  let output = String(input ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|button|link|meta|base|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|button|link|meta|base|svg|math)\b[^>]*\/?>/gi, '')

  output = output.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ''
    if (match.startsWith('</')) return `</${tag}>`
    const selfClosing = tag === 'br' || tag === 'hr' || tag === 'img'
    return `<${tag}${cleanAttrs(tag, attrs.replace(/\/\s*$/, ''))}${selfClosing ? ' /' : ''}>`
  })

  return output.trim()
}

/** Escapa texto para entrar com segurança dentro de HTML (e-mails, atributos). */
export function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Limita o tamanho de uma string e remove caracteres nulos.
 */
export function limitString(input: string, maxLength: number): string {
  return input.replace(/\0/g, '').substring(0, maxLength)
}
