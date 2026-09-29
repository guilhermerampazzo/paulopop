'use client'

/**
 * v1.3 — galeria de imagens das seções: grade/mosaico/carrossel com lightbox simples
 * (teclado: Esc fecha, setas navegam).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { MediaImage } from '@/lib/sections'

interface Props { images: MediaImage[]; layout?: 'grid' | 'carousel' | 'masonry'; title?: string }

export function GalleryLightbox({ images, layout = 'grid', title }: Props) {
  const [index, setIndex] = useState<number | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setIndex(null), [])
  const step = useCallback((d: number) => setIndex(i => (i == null ? i : (i + d + images.length) % images.length)), [images.length])

  useEffect(() => {
    if (index == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [index, close, step])

  const scrollTrack = (d: number) => {
    const el = trackRef.current
    if (el) el.scrollBy({ left: d * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' })
  }

  const thumb = (img: MediaImage, i: number, cls: string) => (
    <button key={`${img.url}-${i}`} type="button" onClick={() => setIndex(i)} className={`group relative overflow-hidden rounded-2xl bg-gray-100 ${cls}`} aria-label={`Abrir imagem ${i + 1}${img.caption ? `: ${img.caption}` : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.url} alt={img.alt ?? img.caption ?? title ?? ''} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      {img.caption && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-left text-xs text-white">{img.caption}</span>}
    </button>
  )

  return (
    <>
      {layout === 'carousel' ? (
        <div className="relative">
          <div ref={trackRef} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:thin]">
            {images.map((img, i) => (
              <div key={`${img.url}-${i}`} className="w-[85%] sm:w-[48%] lg:w-[32%] flex-shrink-0 snap-start aspect-[4/3]">
                {thumb(img, i, 'h-full w-full')}
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <>
              <button type="button" onClick={() => scrollTrack(-1)} aria-label="Imagens anteriores" className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"><ChevronLeft className="w-5 h-5 text-[#1e3a8a]" /></button>
              <button type="button" onClick={() => scrollTrack(1)} aria-label="Próximas imagens" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"><ChevronRight className="w-5 h-5 text-[#1e3a8a]" /></button>
            </>
          )}
        </div>
      ) : layout === 'masonry' ? (
        <div className="columns-2 md:columns-3 gap-3 [&>*]:mb-3">
          {images.map((img, i) => thumb(img, i, 'block w-full break-inside-avoid'))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((img, i) => thumb(img, i, 'aspect-[4/3]'))}
        </div>
      )}

      {index != null && images[index] && (
        <div role="dialog" aria-modal="true" aria-label="Visualização da imagem" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={close}>
          <button type="button" onClick={close} aria-label="Fechar" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X className="w-6 h-6" /></button>
          {images.length > 1 && (
            <>
              <button type="button" onClick={e => { e.stopPropagation(); step(-1) }} aria-label="Imagem anterior" className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><ChevronLeft className="w-7 h-7" /></button>
              <button type="button" onClick={e => { e.stopPropagation(); step(1) }} aria-label="Próxima imagem" className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><ChevronRight className="w-7 h-7" /></button>
            </>
          )}
          <figure className="max-h-full max-w-5xl" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[index].url} alt={images[index].alt ?? images[index].caption ?? ''} className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain" />
            <figcaption className="mt-3 text-center text-sm text-white/80">{images[index].caption} <span className="text-white/50">({index + 1}/{images.length})</span></figcaption>
          </figure>
        </div>
      )}
    </>
  )
}
