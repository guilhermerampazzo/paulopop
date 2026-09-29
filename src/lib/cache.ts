/**
 * v1.1 — cache de dados das páginas públicas (60 s), sem pré-renderizar no build.
 * As páginas continuam dinâmicas (o build no Docker não acessa o banco), mas as consultas
 * repetidas ficam em cache e são renovadas na hora quando algo muda no painel (revalidateTag).
 */
import { unstable_cache, revalidateTag } from 'next/cache'
import { prisma } from './prisma'

export const TAGS = { config: 'config', properties: 'properties', blog: 'blog', empreendimentos: 'empreendimentos' } as const

export const getSiteConfigCached = unstable_cache(
  async () => prisma.siteConfig.findFirst(),
  ['site-config'],
  { revalidate: 60, tags: [TAGS.config] }
)

export const getActiveCitiesCached = unstable_cache(
  async () => {
    const rows = await prisma.property.findMany({
      where: { status: 'ACTIVE', hideOnSite: false, city: { not: null } },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    })
    return Array.from(new Set(rows.map(r => (r.city ?? '').replace(/\s*-\s*DF$/i, '').trim()).filter(Boolean)))
  },
  ['active-cities'],
  { revalidate: 60, tags: [TAGS.properties] }
)

/** Chame depois de salvar algo no painel. */
export function revalidateSite(...tags: Array<keyof typeof TAGS>) {
  const list = tags.length ? tags : (Object.keys(TAGS) as Array<keyof typeof TAGS>)
  for (const t of list) revalidateTag(TAGS[t])
}
