/**
 * v1.3 — busca por texto único nos imóveis (`busca`/`q`): ref, título, bairro, cidade, endereço,
 * bairro comercial e nome do empreendimento, sem diferenciar maiúsculas.
 * `sortByRelevance` coloca o acerto exato na ref primeiro.
 */
import type { Prisma } from '@prisma/client'

export function normalizeSearchText(q: string | null | undefined): string {
  return String(q ?? '').trim().replace(/\s+/g, ' ').slice(0, 120)
}

export function searchTextWhere(qRaw: string): Prisma.PropertyWhereInput[] {
  const q = normalizeSearchText(qRaw)
  if (!q) return []
  const mode = 'insensitive' as const
  const or: Prisma.PropertyWhereInput[] = [
    { ref: { contains: q, mode } },
    { title: { contains: q, mode } },
    { neighborhood: { contains: q, mode } },
    { city: { contains: q, mode } },
    { address: { contains: q, mode } },
    { commercialNeighborhood: { contains: q, mode } },
    { empreendimento: { is: { name: { contains: q, mode } } } },
  ]
  // "PP 001" / "pp-001" → também tenta a ref sem separadores
  const compact = q.replace(/[\s-]/g, '')
  if (compact && compact !== q) or.push({ ref: { contains: compact, mode } })
  return or
}

/** Ordena a página de resultados: ref exata primeiro, depois ref que começa com o texto, depois a ordem original. */
export function sortByRelevance<T extends { ref?: string | null; title?: string | null }>(rows: T[], qRaw: string): T[] {
  const q = normalizeSearchText(qRaw).toLowerCase()
  if (!q) return rows
  const score = (r: T) => {
    const ref = String(r.ref ?? '').toLowerCase()
    if (ref === q) return 0
    if (ref.startsWith(q)) return 1
    if (String(r.title ?? '').toLowerCase().includes(q)) return 2
    return 3
  }
  return rows.map((r, i) => ({ r, i, s: score(r) })).sort((a, b) => a.s - b.s || a.i - b.i).map(x => x.r)
}
