'use client'

/**
 * v1.3 — índice lateral do post gerado dos <h2>/<h3> (ids adicionados no servidor por `addHeadingIds`).
 * Destaca o título visível ao rolar (IntersectionObserver); no celular vira um <details> acima do texto.
 */
import { useEffect, useState } from 'react'
import { List } from 'lucide-react'
import type { TocEntry } from '@/lib/blog'

export function BlogToc({ toc, title = 'Neste artigo', variant = 'desktop' }: { toc: TocEntry[]; title?: string; variant?: 'desktop' | 'mobile' }) {
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    if (!toc.length || typeof IntersectionObserver === 'undefined') return
    const els = toc.map(t => document.getElementById(t.id)).filter((e): e is HTMLElement => !!e)
    if (!els.length) return
    const obs = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) setActive(visible[0].target.id)
    }, { rootMargin: '-120px 0px -65% 0px', threshold: [0, 1] })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [toc])

  if (toc.length < 2) return null

  const list = (
    <ul className="space-y-1 border-l-2 border-[#bfdbfe]">
      {toc.map(t => (
        <li key={t.id}>
          <a
            href={`#${t.id}`}
            className={`block -ml-[2px] border-l-2 py-1 text-sm break-words transition-colors ${t.level === 3 ? 'pl-6' : 'pl-3'} ${
              active === t.id ? 'border-[#ea580c] text-[#1e3a8a] font-semibold' : 'border-transparent text-gray-600 hover:border-[#ea580c] hover:text-[#1e3a8a]'
            }`}
            aria-current={active === t.id ? 'location' : undefined}
          >
            {t.text}
          </a>
        </li>
      ))}
    </ul>
  )

  if (variant === 'mobile') {
    // Celular: recolhido acima do texto (renderize com variant="mobile" dentro do artigo)
    return (
      <details className="lg:hidden rounded-2xl border border-gray-100 bg-[#f8fafc] p-4 mb-6">
        <summary className="cursor-pointer list-none font-semibold text-[#1e3a8a] inline-flex items-center gap-2"><List className="w-4 h-4" /> {title}</summary>
        <div className="mt-3">{list}</div>
      </details>
    )
  }

  // Desktop: lateral fixa
  return (
    <nav aria-label={title} className="hidden lg:block sticky top-32 self-start">
      <p className="text-[#ea580c] uppercase tracking-wide text-xs font-semibold">{title}</p>
      <div className="mt-3">{list}</div>
    </nav>
  )
}
