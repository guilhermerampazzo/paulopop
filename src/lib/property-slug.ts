/**
 * v1.3 — slug do imóvel com bairro/cidade: `apartamento-venda-taguatinga-norte-245856515`.
 * Regras:
 *  - com bairro: tipo-transacao-bairro-ref
 *  - sem bairro, com cidade: tipo-transacao-cidade-ref
 *  - sem os dois: tipo-transacao-ref
 * A ref é normalizada (só letras/números); o padrão antigo era `tipo-residencial-<números>`.
 */
import { slugify } from './utils'

export interface SlugInput {
  propertyType?: string | null
  transactionType?: string | null
  neighborhood?: string | null
  city?: string | null
  ref: string
}

const TRANSACTION_SLUG: Record<string, string> = { SALE: 'venda', RENT: 'aluguel' }

/** Remove " - DF" e afins do nome da cidade. */
export function cleanPlace(name: string | null | undefined): string {
  return String(name ?? '').replace(/\s*-\s*[A-Z]{2}$/i, '').trim()
}

/** Parte da ref usada no slug (só letras e números, minúsculas). */
export function refSlugPart(ref: string): string {
  return String(ref ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function buildPropertySlug(input: SlugInput): string {
  const type = slugify(input.propertyType?.trim() || 'imovel') || 'imovel'
  const transaction = TRANSACTION_SLUG[String(input.transactionType ?? 'SALE').toUpperCase()] ?? 'venda'
  const place = slugify(cleanPlace(input.neighborhood) || cleanPlace(input.city))
  const ref = refSlugPart(input.ref)
  return [type, transaction, place, ref].filter(Boolean).join('-').replace(/-+/g, '-')
}

/** Slug do padrão antigo (`tipo-residencial-123456789` / `tipo-comercial-...`). */
export function isLegacySlug(slug: string): boolean {
  return /-(residencial|comercial)-\d+$/i.test(String(slug ?? ''))
}

/** O slug já contém o bairro (ou, na falta dele, a cidade)? */
export function slugHasLocation(slug: string, input: Pick<SlugInput, 'neighborhood' | 'city'>): boolean {
  const place = slugify(cleanPlace(input.neighborhood) || cleanPlace(input.city))
  if (!place) return true // sem localização não há o que conferir
  return String(slug ?? '').includes(`-${place}-`) || String(slug ?? '').endsWith(`-${place}`)
}

/**
 * Decide se o imóvel precisa de slug novo: padrão antigo, ou localização mudou e o slug não a contém.
 * Devolve o slug proposto ou null se o atual serve.
 */
export function proposePropertySlug(currentSlug: string, input: SlugInput): string | null {
  const next = buildPropertySlug(input)
  if (next === currentSlug) return null
  if (isLegacySlug(currentSlug)) return next
  if (!slugHasLocation(currentSlug, input)) return next
  return null
}

/** Garante unicidade acrescentando -2, -3… (a função `exists` consulta o banco). */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  let candidate = base
  let n = 2
  while (await exists(candidate)) {
    candidate = `${base}-${n++}`
    if (n > 500) break
  }
  return candidate
}
