/**
 * v1.2 — cache de dados das páginas públicas (60 s), sem pré-renderizar no build.
 * As páginas continuam dinâmicas (o build no Docker não acessa o banco), mas as consultas
 * repetidas ficam em cache e são renovadas na hora quando algo muda no painel (revalidateTag).
 *
 * v1.2: disjuntor simples — se o banco falhar, a falha NÃO é re-tentada a cada request
 * (foi isso que virou tempestade em 02/10/2026). Por 10 s após uma falha, retorna o
 * fallback imediatamente sem tocar no banco.
 */
import { unstable_cache, revalidateTag } from 'next/cache'
import { prisma } from './prisma'

export const TAGS = { config: 'config', properties: 'properties', blog: 'blog', empreendimentos: 'empreendimentos' } as const

const FAIL_COOLDOWN_MS = 10_000
const lastFail = new Map<string, number>()

async function withFailCooldown<T>(key: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  const last = lastFail.get(key) ?? 0
  if (Date.now() - last < FAIL_COOLDOWN_MS) return fallback
  try {
    return await fn()
  } catch {
    lastFail.set(key, Date.now())
    return fallback
  }
}

export const getSiteConfigCached = unstable_cache(
  () => withFailCooldown('site-config', () => prisma.siteConfig.findFirst(), null),
  ['site-config'],
  { revalidate: 60, tags: [TAGS.config] }
)

export const getActiveCitiesCached = unstable_cache(
  () =>
    withFailCooldown(
      'active-cities',
      async () => {
        const rows = await prisma.property.findMany({
          where: { status: 'ACTIVE', hideOnSite: false, city: { not: null } },
          select: { city: true },
          distinct: ['city'],
          orderBy: { city: 'asc' },
        })
        return Array.from(new Set(rows.map(r => (r.city ?? '').replace(/\s*-\s*DF$/i, '').trim()).filter(Boolean)))
      },
      [] as string[],
    ),
  ['active-cities'],
  { revalidate: 60, tags: [TAGS.properties] }
)

/** Chame depois de salvar algo no painel. */
export function revalidateSite(...tags: Array<keyof typeof TAGS>) {
  const list = tags.length ? tags : (Object.keys(TAGS) as Array<keyof typeof TAGS>)
  for (const t of list) revalidateTag(TAGS[t])
}
