'use client'

import Script from 'next/script'

interface GoogleReviewsProps {
  title?: string
  className?: string
}

export function GoogleReviews({ title = 'O que nossos clientes dizem', className = '' }: GoogleReviewsProps) {
  return (
    <section className={className}>
      {title && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2563eb]">Avaliações</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-[#1e3a8a]">{title}</h2>
        </div>
      )}
      {/* v1.1: o script do Elfsight só carrega onde o widget aparece, e depois da página (lazy) */}
      <Script src="https://elfsightcdn.com/platform.js" strategy="lazyOnload" />
      <div className="elfsight-app-88dc3d84-544c-4b26-ac07-522d45347129" data-elfsight-app-lazy />
    </section>
  )
}
