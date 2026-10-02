export const dynamic = 'force-dynamic'

import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/site'
import { blogPublishedWhere } from '@/lib/blog'

const BASE_URL = SITE_URL

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [properties, blogPosts, empreendimentos, cityPages, partners] = await Promise.all([
    prisma.property.findMany({
      where: { status: 'ACTIVE', hideOnSite: false },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.blogPost.findMany({
      where: blogPublishedWhere(),
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    }),
    prisma.empreendimento.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.cityPage.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
    prisma.partner.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/imoveis`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/empreendimentos`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/sobre`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contato`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]

  const propertyRoutes: MetadataRoute.Sitemap = properties.map(p => ({
    url: `${BASE_URL}/imoveis/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map(p => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const empreendimentoRoutes: MetadataRoute.Sitemap = empreendimentos.map(e => ({
    url: `${BASE_URL}/empreendimentos/${e.slug}`,
    lastModified: e.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))

  // v1.5: /contato saiu daqui — já está em staticRoutes (aparecia duas vezes no sitemap)
  const extraStatic: MetadataRoute.Sitemap = ['/cidades', '/parceiros', '/vender', '/politica-de-privacidade', '/termos-de-uso'].map(p => ({ url: `${BASE_URL}${p}`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: p === '/vender' ? 0.8 : 0.5 }))
  const cityRoutes: MetadataRoute.Sitemap = cityPages.map(c => ({ url: `${BASE_URL}/cidades/${c.slug}`, lastModified: c.updatedAt, changeFrequency: 'weekly' as const, priority: 0.7 }))
  const partnerRoutes: MetadataRoute.Sitemap = partners.map(c => ({ url: `${BASE_URL}/parceiros/${c.slug}`, lastModified: c.updatedAt, changeFrequency: 'monthly' as const, priority: 0.4 }))
  return [...staticRoutes, ...extraStatic, ...propertyRoutes, ...blogRoutes, ...empreendimentoRoutes, ...cityRoutes, ...partnerRoutes]
}
