'use client'

/**
 * v1.3 — Galeria do imóvel no padrão dos grandes portais:
 * abas Fotos / Vídeo / Tour 360 / Plantas / Mapa (só as que têm conteúdo),
 * fotos agrupadas por cômodo (legenda), capa 4:3 + mosaico 1+4 no desktop, carrossel no celular,
 * lightbox próprio com swipe, setas, zoom simples, contador e legenda.
 * As 5 primeiras fotos carregam com prioridade; o resto é lazy.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, ChevronLeft, ChevronRight, Compass, Images, LayoutGrid, Map as MapIcon, Video, X, ZoomIn, ZoomOut } from 'lucide-react'
import { groupPhotos, floorPlanPhotos, type GalleryPhoto } from '@/lib/gallery-groups'
import { youtubeEmbedUrl } from '@/lib/youtube'
import { cn } from '@/lib/utils'

export interface GalleryVideo { url: string; platform?: string | null }

interface PropertyGalleryProps {
  images: GalleryPhoto[]
  videos?: GalleryVideo[]
  virtualTourUrl?: string | null
  latitude?: number | null
  longitude?: number | null
  title?: string
  /** Selo sobre a capa (ex.: "Lançamento") */
  badge?: string | null
}

type TabKey = 'fotos' | 'video' | 'tour' | 'plantas' | 'mapa'

const PRIORITY_COUNT = 5

function isVerticalVideo(url: string): boolean {
  return /shorts\/|reel|tiktok|\/reels\//i.test(url)
}

export function PropertyGallery({ images, videos = [], virtualTourUrl, latitude, longitude, title, badge }: PropertyGalleryProps) {
  const groups = useMemo(() => groupPhotos(images), [images])
  const plans = useMemo(() => floorPlanPhotos(images), [images])
  const photos = useMemo(() => groups.flatMap(g => g.photos), [groups]) // ordem exibida (sem plantas)
  const validVideos = useMemo(() => videos.filter(v => youtubeEmbedUrl(v.url)), [videos])
  const hasMap = latitude != null && longitude != null

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode; count?: number }> = []
  if (photos.length) tabs.push({ key: 'fotos', label: 'Fotos', icon: <Camera className="w-4 h-4" />, count: photos.length })
  if (validVideos.length) tabs.push({ key: 'video', label: 'Vídeo', icon: <Video className="w-4 h-4" />, count: validVideos.length })
  if (virtualTourUrl) tabs.push({ key: 'tour', label: 'Tour 360', icon: <Compass className="w-4 h-4" /> })
  if (plans.length) tabs.push({ key: 'plantas', label: 'Plantas', icon: <LayoutGrid className="w-4 h-4" />, count: plans.length })
  if (hasMap) tabs.push({ key: 'mapa', label: 'Mapa', icon: <MapIcon className="w-4 h-4" /> })

  const [tab, setTab] = useState<TabKey>(tabs[0]?.key ?? 'fotos')
  const [group, setGroup] = useState<string>('all')
  const [lightbox, setLightbox] = useState<{ list: GalleryPhoto[]; index: number } | null>(null)

  const visiblePhotos = group === 'all' ? photos : (groups.find(g => g.name === group)?.photos ?? photos)

  if (!tabs.length) {
    return (
      <div className="w-full aspect-[4/3] md:aspect-[21/9] bg-gradient-to-br from-[#1e3a8a]/10 to-[#2563eb]/10 rounded-2xl flex items-center justify-center">
        <Images className="w-16 h-16 text-gray-300" aria-hidden="true" />
      </div>
    )
  }

  const openAt = (list: GalleryPhoto[], index: number) => setLightbox({ list, index })

  return (
    <div className="min-w-0">
      {/* Abas */}
      {tabs.length > 1 && (
        <div role="tablist" aria-label="Mídia do imóvel" className="mb-3 flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                tab === t.key ? 'bg-[#1e3a8a] border-[#1e3a8a] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-[#1e3a8a] hover:text-[#1e3a8a]',
              )}
            >
              {t.icon}
              {t.label}
              {t.count != null && <span className={cn('text-xs', tab === t.key ? 'text-white/70' : 'text-gray-400')}>({t.count})</span>}
            </button>
          ))}
        </div>
      )}

      {tab === 'fotos' && (
        <>
          {/* Grupos por cômodo */}
          {groups.length > 1 && (
            <div className="mb-3 flex gap-1.5 overflow-x-auto text-xs [scrollbar-width:none]" role="tablist" aria-label="Cômodos">
              <GroupChip active={group === 'all'} onClick={() => setGroup('all')} label={`Todas (${photos.length})`} />
              {groups.map(g => (
                <GroupChip key={g.name} active={group === g.name} onClick={() => setGroup(g.name)} label={`${g.name} (${g.photos.length})`} />
              ))}
            </div>
          )}

          {/* Desktop: capa 4:3 + mosaico 1+4 */}
          <div className="relative hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[460px] lg:h-[520px]">
            {visiblePhotos.slice(0, 5).map((img, i) => {
              const isCover = i === 0
              const isLast = i === 4 || i === visiblePhotos.length - 1
              const remaining = visiblePhotos.length - 5
              return (
                <button
                  key={img.url + i}
                  type="button"
                  onClick={() => openAt(visiblePhotos, i)}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]',
                    isCover ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1',
                  )}
                  aria-label={img.caption ? `Ver foto: ${img.caption}` : `Ver foto ${i + 1}`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt ?? img.caption ?? title ?? ''}
                    fill
                    priority={isCover}
                    loading={i < PRIORITY_COUNT ? 'eager' : 'lazy'}
                    sizes={isCover ? '(max-width: 1280px) 50vw, 640px' : '(max-width: 1280px) 25vw, 320px'}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {isCover && badge && (
                    <span className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-[#1e3a8a] text-white text-xs font-semibold shadow">{badge}</span>
                  )}
                  {isLast && remaining > 0 && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white font-semibold">+{remaining} fotos</span>
                  )}
                </button>
              )
            })}
            {visiblePhotos.length < 5 && Array.from({ length: 5 - visiblePhotos.length }).map((_, i) => (
              <div key={`empty-${i}`} className="rounded-2xl bg-[#eff6ff] flex items-center justify-center" aria-hidden="true">
                <Camera className="w-6 h-6 text-[#1e3a8a]/20" />
              </div>
            ))}
            <button
              type="button"
              onClick={() => openAt(visiblePhotos, 0)}
              className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#1e3a8a] shadow-md hover:bg-white"
              aria-label={`Ver todas as ${visiblePhotos.length} fotos`}
            >
              <Images className="w-3.5 h-3.5" /> Ver todas ({visiblePhotos.length})
            </button>
          </div>

          {/* Celular: carrossel com snap */}
          <MobileCarousel photos={visiblePhotos} title={title} badge={badge} onOpen={i => openAt(visiblePhotos, i)} />
        </>
      )}

      {tab === 'video' && (
        <div className="space-y-4">
          {validVideos.map((v, i) => {
            const embed = youtubeEmbedUrl(v.url)!
            const vertical = isVerticalVideo(v.url)
            return (
              <div key={v.url + i} className={vertical ? 'mx-auto w-full max-w-[380px] aspect-[9/16]' : 'w-full aspect-video'}>
                <iframe
                  src={embed}
                  title={`Vídeo ${i + 1}${title ? ` — ${title}` : ''}`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full rounded-2xl border-0 bg-black"
                />
              </div>
            )
          })}
        </div>
      )}

      {tab === 'tour' && virtualTourUrl && (
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-gray-100">
          <iframe src={virtualTourUrl} title="Tour virtual 360" className="w-full h-full border-0" allowFullScreen loading="lazy" allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen" />
        </div>
      )}

      {tab === 'plantas' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {plans.map((img, i) => (
            <button key={img.url + i} type="button" onClick={() => openAt(plans, i)} className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white border border-gray-100" aria-label={`Ver planta ${i + 1}`}>
              <Image src={img.url} alt={img.alt ?? img.caption ?? `Planta ${i + 1}`} fill loading="lazy" sizes="(max-width: 640px) 100vw, 50vw" className="object-contain" />
              {img.caption && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-left text-xs text-white">{img.caption}</span>}
            </button>
          ))}
        </div>
      )}

      {tab === 'mapa' && hasMap && (
        <div className="w-full aspect-[4/3] md:aspect-[21/9] rounded-2xl overflow-hidden bg-gray-100">
          <iframe
            title={`Mapa da localização: ${title ?? 'Imóvel'}`}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude! - 0.008},${latitude! - 0.008},${longitude! + 0.008},${latitude! + 0.008}&layer=mapnik&marker=${latitude},${longitude}`}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {lightbox && (
        <Lightbox list={lightbox.list} index={lightbox.index} title={title} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}

function GroupChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn('flex-shrink-0 rounded-full px-3 py-1 font-medium transition-colors', active ? 'bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe]' : 'bg-white border border-gray-200 text-gray-500 hover:text-[#1e3a8a]')}
    >
      {label}
    </button>
  )
}

function MobileCarousel({ photos, title, badge, onOpen }: { photos: GalleryPhoto[]; title?: string; badge?: string | null; onOpen: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const onScroll = () => {
    const el = ref.current
    if (!el || !el.clientWidth) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }
  return (
    <div className="relative md:hidden">
      <div ref={ref} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory rounded-2xl bg-gray-100 [scrollbar-width:none]" style={{ scrollbarWidth: 'none' }} aria-label="Fotos do imóvel">
        {photos.map((img, i) => (
          <button key={img.url + i} type="button" onClick={() => onOpen(i)} className="relative w-full flex-shrink-0 snap-center aspect-[4/3]" aria-label={img.caption ? `Ver foto: ${img.caption}` : `Ver foto ${i + 1}`}>
            <Image src={img.url} alt={img.alt ?? img.caption ?? title ?? ''} fill priority={i === 0} loading={i < PRIORITY_COUNT ? 'eager' : 'lazy'} sizes="100vw" className="object-cover" />
          </button>
        ))}
      </div>
      {badge && <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#1e3a8a] text-white text-xs font-semibold shadow">{badge}</span>}
      {photos.length > 1 && (
        <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
          {active + 1}/{photos.length}
        </span>
      )}
    </div>
  )
}

/** Lightbox próprio: swipe, setas, zoom simples (toque duplo / botão), contador e legenda. */
function Lightbox({ list, index: start, title, onClose }: { list: GalleryPhoto[]; index: number; title?: string; onClose: () => void }) {
  const [index, setIndex] = useState(start)
  const [zoom, setZoom] = useState(false)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const total = list.length

  const step = useCallback((d: number) => {
    setZoom(false)
    setIndex(i => (i + d + total) % total)
  }, [total])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose, step])

  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current || zoom) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1)
  }

  const img = list[index]
  const caption = img?.caption ?? img?.alt ?? null

  return (
    <div role="dialog" aria-modal="true" aria-label="Galeria de fotos" className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white" onClick={onClose}>
      <div className="flex items-center justify-between gap-3 px-4 py-3" onClick={e => e.stopPropagation()}>
        <span className="text-sm font-medium tabular-nums">{index + 1} / {total}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setZoom(z => !z)} aria-label={zoom ? 'Reduzir' : 'Ampliar'} className="rounded-full bg-white/10 p-2 hover:bg-white/20">
            {zoom ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
          </button>
          <button type="button" onClick={onClose} aria-label="Fechar galeria" className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {total > 1 && (
          <>
            <button type="button" onClick={e => { e.stopPropagation(); step(-1) }} aria-label="Foto anterior" className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 p-2 hover:bg-white/20"><ChevronLeft className="w-7 h-7" /></button>
            <button type="button" onClick={e => { e.stopPropagation(); step(1) }} aria-label="Próxima foto" className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 p-2 hover:bg-white/20"><ChevronRight className="w-7 h-7" /></button>
          </>
        )}
        <div className={cn('relative w-full h-full', zoom ? 'overflow-auto' : '')} onClick={e => e.stopPropagation()} onDoubleClick={() => setZoom(z => !z)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt={img.alt ?? img.caption ?? title ?? ''}
            draggable={false}
            className={cn('select-none transition-transform duration-200', zoom ? 'max-w-none w-[180%] md:w-[140%] h-auto mx-auto cursor-zoom-out' : 'absolute inset-0 w-full h-full object-contain cursor-zoom-in')}
          />
        </div>
      </div>
      <div className="px-4 py-3 text-center text-sm text-white/80 min-h-[44px]" onClick={e => e.stopPropagation()}>
        {caption}
      </div>
      {total > 1 && (
        <div className="hidden md:flex gap-1.5 justify-center overflow-x-auto px-4 pb-4 [scrollbar-width:thin]" onClick={e => e.stopPropagation()}>
          {list.map((p, i) => (
            <button key={p.url + i} type="button" onClick={() => { setZoom(false); setIndex(i) }} aria-label={`Ir para a foto ${i + 1}`} className={cn('relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-md border-2', i === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100')}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumbnailUrl ?? p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
