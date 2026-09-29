'use client'

/**
 * v1.3 — tabela de posts do painel: título, categoria, status (Rascunho / Agendado / Publicado),
 * cidade, data, autor e ações (ver no site ou pré-visualizar, editar, duplicar, excluir).
 */
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState } from 'react'
import { Pencil, Globe, FileText, Trash2, X, CheckCircle, AlertCircle, Loader2, Eye, Copy, Clock, Star } from 'lucide-react'
import { postVisibility, formatBlogDateTime, VISIBILITY_LABEL, type BlogVisibility } from '@/lib/blog'

interface Post {
  id: string
  slug: string
  title: string
  excerpt?: string | null
  coverUrl?: string | null
  category?: string | null
  status: 'DRAFT' | 'PUBLISHED'
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
  citySlug?: string | null
  series?: string | null
  featured: boolean
  readingMinutes?: number | null
  author: { name: string }
}

interface Props {
  posts: Post[]
  cityNames: Record<string, string>
  total: number
  page: number
  totalPages: number
}

const BADGE: Record<BlogVisibility, string> = {
  draft: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
}

function StatusBadge({ v }: { v: BlogVisibility }) {
  const Icon = v === 'published' ? Globe : v === 'scheduled' ? Clock : FileText
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${BADGE[v]}`}>
      <Icon className="w-3 h-3" /> {VISIBILITY_LABEL[v]}
    </span>
  )
}

export function BlogListClient({ posts, cityNames, total, page, totalPages }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function handleDelete(id: string) {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setFeedback({ type: 'success', msg: 'Post excluído com sucesso.' })
      setDeleteId(null)
      startTransition(() => router.refresh())
    } catch {
      setFeedback({ type: 'error', msg: 'Erro ao excluir post.' })
    } finally {
      setBusy(null)
    }
  }

  async function handleDuplicate(id: string) {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/blog/${id}/duplicar`, { method: 'POST' })
      const data = await res.json().catch(() => ({})) as { id?: string; error?: string }
      if (!res.ok || !data.id) throw new Error(data.error ?? 'Erro ao duplicar')
      setFeedback({ type: 'success', msg: 'Cópia criada como rascunho. Abrindo o editor...' })
      router.push(`/admin/blog/${data.id}`)
    } catch (e) {
      setFeedback({ type: 'error', msg: e instanceof Error ? e.message : 'Erro ao duplicar post.' })
    } finally {
      setBusy(null)
    }
  }

  function buildPageHref(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    return `?${params.toString()}`
  }

  return (
    <>
      {feedback && (
        <div
          role="alert"
          aria-live="polite"
          className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.type === 'success'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {feedback.msg}
          <button onClick={() => setFeedback(null)} className="ml-auto" aria-label="Fechar"><X className="w-3 h-3" /></button>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400">Nenhum post encontrado.</p>
          <Link href="/admin/blog/novo" className="mt-3 inline-block text-sm text-[#2563eb] hover:underline">
            Criar o primeiro post →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Título</th>
                <th className="px-3 py-3 font-semibold">Categoria</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Cidade</th>
                <th className="px-3 py-3 font-semibold">Data</th>
                <th className="px-3 py-3 font-semibold">Autor</th>
                <th className="px-3 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map(post => {
                const v = postVisibility(post)
                const viewHref = v === 'published' ? `/blog/${post.slug}` : `/blog/${post.slug}?preview=1`
                return (
                  <tr key={post.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 max-w-[320px]">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-14 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 hidden md:block">
                          {post.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.coverUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><FileText className="w-4 h-4 text-gray-300" /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/blog/${post.id}`} className="font-medium text-gray-900 hover:text-[#1e3a8a] line-clamp-2 break-words">
                            {post.featured && <Star className="inline w-3.5 h-3.5 text-[#ea580c] mr-1 -mt-0.5" aria-label="Destaque" />}
                            {post.title}
                          </Link>
                          <p className="text-xs text-gray-400 truncate">
                            /blog/{post.slug}{post.series ? ` · Série: ${post.series}` : ''}{post.readingMinutes ? ` · ${post.readingMinutes} min` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{post.category || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-3"><StatusBadge v={v} /></td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{post.citySlug ? (cityNames[post.citySlug] ?? post.citySlug) : <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {post.publishedAt
                        ? <span title={v === 'scheduled' ? 'Vai ao ar em' : 'Publicado em'}>{formatBlogDateTime(post.publishedAt)}</span>
                        : <span title="Criado em">{formatBlogDateTime(post.createdAt)}</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{post.author.name}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={viewHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#2563eb]"
                          aria-label={v === 'published' ? `Ver no site: ${post.title}` : `Pré-visualizar: ${post.title}`}
                          title={v === 'published' ? 'Ver no site' : 'Pré-visualizar (só logado)'}
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <Link
                          href={`/admin/blog/${post.id}`}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#1e3a8a]"
                          aria-label={`Editar post: ${post.title}`}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(post.id)}
                          disabled={busy === post.id}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#1e3a8a] disabled:opacity-50"
                          aria-label={`Duplicar post: ${post.title}`}
                          title="Duplicar"
                        >
                          {busy === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setDeleteId(post.id)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500"
                          aria-label={`Excluir post: ${post.title}`}
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
          <p className="text-sm text-gray-500">{total} posts no total</p>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <Link
                key={p}
                href={buildPageHref(p)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-[#2563eb] hover:text-[#1e3a8a]'
                }`}
                aria-label={`Página ${p}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir post</h3>
            <p className="text-sm text-gray-500 mb-6">
              Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={busy === deleteId}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-60"
              >
                {busy === deleteId && <Loader2 className="w-4 h-4 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
