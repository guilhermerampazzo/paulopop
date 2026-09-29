import { Star, Quote } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { TAGS } from '@/lib/cache'

/** v1.1 — depoimentos aprovados no painel (Admin → Depoimentos), exibidos no site. */
const getTestimonials = unstable_cache(
  async () => prisma.testimonial.findMany({
    where: { approved: true },
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: { id: true, name: true, role: true, text: true, rating: true, avatarUrl: true },
  }),
  ['testimonials'],
  { revalidate: 60, tags: [TAGS.config] }
)

export async function Testimonials({ title = 'O que dizem os clientes', className = '' }: { title?: string; className?: string }) {
  const items = await getTestimonials().catch(() => [])
  if (!items.length) return null
  return (
    <section className={className} aria-labelledby="depoimentos-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2563eb]">Depoimentos</p>
        <h2 id="depoimentos-title" className="mt-2 font-display text-3xl font-bold text-[#1e3a8a]">{title}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map(t => (
            <figure key={t.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <Quote className="h-6 w-6 text-[#ea580c]" aria-hidden="true" />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-gray-700">{t.text}</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                {t.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eff6ff] text-sm font-bold text-[#1e3a8a]">{t.name.charAt(0)}</span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1e3a8a]">{t.name}</p>
                  {t.role && <p className="truncate text-xs text-gray-500">{t.role}</p>}
                </div>
                <span className="ml-auto flex items-center gap-0.5" aria-label={`${t.rating} de 5 estrelas`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                  ))}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
