/**
 * v1.3 — helpers do blog (painel e site):
 * visibilidade (publicado x agendado x rascunho), filtro Prisma dos posts visíveis,
 * ids nos títulos do conteúdo para o índice lateral, tempo de leitura,
 * datas no horário de Brasília e conversão do Markdown de posts antigos.
 */
import { stripHtml } from './sanitize'
import { readingMinutes, sectionsPlainText, type Section } from './sections'

export const BLOG_CATEGORIES = [
  'Guia do comprador',
  'Guia do proprietário',
  'Mercado',
  'Cidades',
  'Empreendimentos',
  'Financiamento',
  'Dicas',
] as const

/** Séries que ganham destaque no hub do blog (na ordem). */
export const FEATURED_SERIES = ['Guia do comprador', 'Guia do proprietário'] as const

export type BlogStatus = 'DRAFT' | 'PUBLISHED'
export type BlogVisibility = 'draft' | 'scheduled' | 'published'

export const VISIBILITY_LABEL: Record<BlogVisibility, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  published: 'Publicado',
}

interface VisibilityInput { status: BlogStatus | string; publishedAt?: Date | string | null }

/** Rascunho, agendado (publicado com data futura) ou publicado. */
export function postVisibility(post: VisibilityInput, now: Date = new Date()): BlogVisibility {
  if (post.status !== 'PUBLISHED') return 'draft'
  if (!post.publishedAt) return 'published'
  const at = post.publishedAt instanceof Date ? post.publishedAt : new Date(post.publishedAt)
  return at.getTime() > now.getTime() ? 'scheduled' : 'published'
}

/** Um post aparece no site só quando está PUBLISHED e `publishedAt` já passou. */
export function isVisiblePost(post: VisibilityInput, now: Date = new Date()): boolean {
  return postVisibility(post, now) === 'published'
}

/** Filtro Prisma dos posts visíveis no site (use com `prisma.blogPost`). */
export function blogPublishedWhere(now: Date = new Date()) {
  return { status: 'PUBLISHED' as const, publishedAt: { lte: now } }
}

// ─── Índice lateral (ids nos <h2>/<h3>) ─────────────────────────────────────

export interface TocEntry { id: string; text: string; level: 2 | 3 }

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
}

/** Slug simples para ids de âncora (sem acentos, só a-z0-9 e hífen). */
export function headingSlug(text: string): string {
  const s = decodeEntities(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return s || 'secao'
}

/**
 * Adiciona `id` aos <h2> e <h3> do HTML (mantém ids já existentes) e devolve o índice.
 * Ids repetidos ganham sufixo -2, -3… O HTML deve já ter passado por `sanitizeHtml`.
 */
/**
 * v1.5 — A página do post já tem o título como H1; um H1 dentro do texto
 * (colado de outro lugar) vira H2, para a página ter um título principal só.
 */
export function demoteH1(html: string): string {
  return String(html ?? '')
    .replace(/<h1\b/gi, '<h2')
    .replace(/<\/h1\s*>/gi, '</h2>')
}

/** v1.5 — O texto tem algum H1? (aviso no editor do blog) */
export function hasH1(html: string): boolean {
  return /<h1\b/i.test(String(html ?? ''))
}

export function addHeadingIds(html: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = []
  const used = new Set<string>()
  const out = String(html ?? '').replace(/<h([23])\b([^>]*)>([\s\S]*?)<\/h\1\s*>/gi, (_m, lvl: string, attrs: string, inner: string) => {
    const text = decodeEntities(stripHtml(inner)).replace(/\s+/g, ' ').trim()
    if (!text) return `<h${lvl}${attrs}>${inner}</h${lvl}>`
    const existing = attrs.match(/\sid\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/i)
    let id = existing ? (existing[2] ?? existing[3] ?? existing[4] ?? '').trim() : ''
    if (!id) {
      const base = headingSlug(text)
      id = base
      let n = 2
      while (used.has(id)) id = `${base}-${n++}`
    }
    used.add(id)
    const cleanAttrs = existing ? attrs.replace(existing[0], '') : attrs
    toc.push({ id, text, level: lvl === '2' ? 2 : 3 })
    return `<h${lvl} id="${id.replace(/"/g, '')}"${cleanAttrs}>${inner}</h${lvl}>`
  })
  return { html: out, toc }
}

// ─── Tempo de leitura ────────────────────────────────────────────────────────

/** Minutos de leitura do corpo (HTML) mais os blocos extras. */
export function computeReadingMinutes(contentHtml: string, sections: Section[] = []): number {
  const text = `${stripHtml(String(contentHtml ?? '').replace(/<[^>]+>/g, ' '))} ${sectionsPlainText(sections)}`
  return readingMinutes(text)
}

// ─── Horário de Brasília (UTC-3, sem horário de verão) ──────────────────────

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000

/** "2026-09-29T14:30" (horário de Brasília) → Date em UTC. Inválido → null. */
export function parseBrasiliaDateTime(value: string | null | undefined): Date | null {
  const s = String(value ?? '').trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!m) {
    const d = s ? new Date(s) : null
    return d && !Number.isNaN(d.getTime()) ? d : null
  }
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0))
  return new Date(utc + BRT_OFFSET_MS)
}

/** Date → "YYYY-MM-DDTHH:mm" no horário de Brasília (para <input type="datetime-local">). */
export function toBrasiliaInput(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const local = new Date(d.getTime() - BRT_OFFSET_MS)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${local.getUTCFullYear()}-${p(local.getUTCMonth() + 1)}-${p(local.getUTCDate())}T${p(local.getUTCHours())}:${p(local.getUTCMinutes())}`
}

/** Data por extenso em pt-BR (fuso de Brasília). */
export function formatBlogDate(date: Date | string | null | undefined, style: 'short' | 'long' = 'short'): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: style === 'long' ? 'long' : 'short', year: 'numeric',
  }).format(d)
}

/** Data e hora (pt-BR, Brasília). */
export function formatBlogDateTime(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
}

// ─── Conteúdo antigo em Markdown ────────────────────────────────────────────

/** Posts anteriores à v1.1 foram gravados em Markdown; os novos são HTML do TipTap. */
export function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^(?!<[a-z]).+$/gm, line => (line.trim() ? `<p>${line}</p>` : ''))
    .replace(/\n{3,}/g, '\n\n')
}

/** Corpo do post pronto para sanitizar: HTML (TipTap) ou Markdown antigo convertido. */
export function contentToHtml(content: string): string {
  const c = String(content ?? '')
  return c.trimStart().startsWith('<') ? c : markdownToHtml(c)
}

// ─── Utilidades de texto ────────────────────────────────────────────────────

/** Texto do post (sem HTML) limitado para descrições/RSS. */
export function excerptFromContent(content: string, max = 160): string {
  const text = stripHtml(contentToHtml(content).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'
}

/** Link do WhatsApp com mensagem; sem número cai em /contato. */
export function whatsappLink(whatsapp: string | null | undefined, text: string): string {
  const digits = String(whatsapp ?? '').replace(/\D/g, '')
  if (!digits) return '/contato'
  const full = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}
