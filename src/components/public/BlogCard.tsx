/**
 * v1.3 — Card de post do blog (hub, relacionados, séries): capa 16:9, categoria, título,
 * resumo, autor (foto/CRECI), data e tempo de leitura. Server component (sem hooks).
 */
import Link from 'next/link'
import { Calendar, Clock } from 'lucide-react'
import { formatBlogDate } from '@/lib/blog'

export interface BlogCardPost {
  slug: string
  title: string
  excerpt?: string | null
  coverUrl?: string | null
  category?: string | null
  publishedAt?: Date | string | null
  readingMinutes?: number | null
  author?: { name: string; avatarUrl?: string | null; creci?: string | null } | null
}

export function AuthorAvatar({ author, size = 'sm' }: { author: { name: string; avatarUrl?: string | null } | null | undefined; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-7 h-7 text-xs'
  if (!author) return null
  return author.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={author.avatarUrl} alt={author.name} loading="lazy" className={`${cls} rounded-full object-cover flex-shrink-0 bg-[#eff6ff]`} />
  ) : (
    <span className={`${cls} rounded-full bg-[#2563eb] text-white font-bold flex items-center justify-center flex-shrink-0`} aria-hidden="true">
      {author.name.charAt(0).toUpperCase()}
    </span>
  )
}

export function BlogCard({ post, compact = false, priority = false }: { post: BlogCardPost; compact?: boolean; priority?: boolean }) {
  return (
    <article className="group h-full bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:border-[#2563eb]/30 transition-all flex flex-col min-w-0">
      <Link href={`/blog/${post.slug}`} className="block aspect-[16/9] bg-[#dbeafe] overflow-hidden" aria-label={`Ler: ${post.title}`}>
        {post.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverUrl}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-display text-4xl font-bold text-[#1e3a8a]/20">PP</span>
          </div>
        )}
      </Link>
      <div className={`flex flex-col flex-1 ${compact ? 'p-4' : 'p-5'}`}>
        {post.category && (
          <Link href={`/blog?categoria=${encodeURIComponent(post.category)}`} className="self-start inline-block px-2.5 py-0.5 bg-[#eff6ff] text-[#1e3a8a] text-xs font-medium rounded-full mb-2 hover:bg-[#dbeafe]">
            {post.category}
          </Link>
        )}
        <h3 className={`font-semibold text-gray-900 group-hover:text-[#1e3a8a] transition-colors break-words ${compact ? 'text-base line-clamp-2' : 'text-lg line-clamp-2'}`}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        {!compact && post.excerpt && (
          <p className="mt-2 text-sm text-gray-500 line-clamp-3 break-words">{post.excerpt}</p>
        )}
        <div className="mt-auto pt-4 flex items-center justify-between gap-2 text-xs text-gray-400 min-w-0">
          {post.author ? (
            <span className="flex items-center gap-2 min-w-0">
              <AuthorAvatar author={post.author} />
              <span className="truncate">
                {post.author.name}
                {post.author.creci && <span className="text-gray-300"> · CRECI {post.author.creci}</span>}
              </span>
            </span>
          ) : <span />}
          <span className="flex items-center gap-2 flex-shrink-0">
            {post.publishedAt && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatBlogDate(post.publishedAt)}</span>}
            {post.readingMinutes ? <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readingMinutes} min</span> : null}
          </span>
        </div>
      </div>
    </article>
  )
}
