export const dynamic = 'force-dynamic'

/**
 * Painel › Blog — lista de posts.
 * v1.3: tabela com título, categoria, status (Rascunho / Agendado / Publicado), cidade, data, autor
 * e visualização; filtro por status (inclui agendados), busca; duplicar post.
 */
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Plus } from 'lucide-react'
import { getPublishedCityLinksCached } from '@/lib/city-pages'
import { LIST_SELECT, blogListWhere } from '@/app/api/admin/blog/shared'
import { BlogListClient } from './BlogListClient'

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string }
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const pageSize = 20
  const q = searchParams.q
  const status = searchParams.status
  const where = blogListWhere(q, status)

  const [posts, total, cities] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: LIST_SELECT,
    }),
    prisma.blogPost.count({ where }),
    getPublishedCityLinksCached().catch(() => []),
  ])

  const cityNames: Record<string, string> = {}
  for (const c of cities) cityNames[c.slug] = c.name

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a8a]">Blog</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} post{total !== 1 ? 's' : ''} no total</p>
        </div>
        <Link
          href="/admin/blog/novo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm font-medium rounded-lg transition-colors"
          aria-label="Criar novo post"
        >
          <Plus className="w-4 h-4" /> Novo post
        </Link>
      </div>

      {/* Filtros */}
      <form method="GET" className="flex flex-col sm:flex-row gap-3 mb-6">
        <label htmlFor="blog-q" className="sr-only">Buscar posts</label>
        <input
          id="blog-q"
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por título, categoria, série ou tag..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white"
        />
        <label htmlFor="blog-status" className="sr-only">Filtrar por status</label>
        <select
          id="blog-status"
          name="status"
          defaultValue={status ?? ''}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] text-gray-700"
        >
          <option value="">Todos os status</option>
          <option value="DRAFT">Rascunho</option>
          <option value="SCHEDULED">Agendado</option>
          <option value="PUBLISHED">Publicado</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 border border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#eff6ff] text-sm font-medium rounded-lg transition-colors"
        >
          Filtrar
        </button>
      </form>

      <BlogListClient
        posts={JSON.parse(JSON.stringify(posts))}
        cityNames={cityNames}
        total={total}
        page={page}
        totalPages={Math.ceil(total / pageSize)}
      />
    </div>
  )
}
