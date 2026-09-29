/**
 * v1.3 — consultas em cache das páginas de cidade e parceiros publicados
 * (menu/rodapé, hubs). Renovadas com `revalidateSite('config')` ao salvar no painel.
 */
import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'
import { TAGS } from './cache'

export interface CityLink { slug: string; name: string }

export const getPublishedCityLinksCached = unstable_cache(
  async (): Promise<CityLink[]> => prisma.cityPage.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: { slug: true, name: true },
  }),
  ['city-links'],
  { revalidate: 60, tags: [TAGS.config] }
)
