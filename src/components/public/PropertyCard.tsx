'use client'

/**
 * Card de imóvel (público). v1.3: carrossel de até 5 fotos com setas, preço/m², código,
 * selos Lançamento / Preço reduzido / Novo / Vendido, favoritar (localStorage) e WhatsApp.
 * Continua aceitando só `coverImage` (compatível com os usos antigos).
 */
import Link from 'next/link'
import Image from 'next/image'
import { memo, useEffect, useState } from 'react'
import { Bed, Bath, LayoutGrid, Maximize2, Car, Heart, Share2, BedDouble, Sun, ChevronLeft, ChevronRight, MessageCircle, Tag } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/sales'
import { isFavorite, toggleFavorite, subscribe, FAVORITES_KEY } from '@/lib/favorites'
import { shareLink, waHref } from '@/lib/share'

export interface PropertyCardProps {
  id: string
  slug: string
  /** código do imóvel (não use `ref`: é reservado pelo React) */
  propertyRef?: string | null
  title?: string | null
  propertyType?: string | null
  transactionType: string
  status: string
  price?: number | null
  totalArea?: number | null
  usefulArea?: number | null
  suites?: number | null
  balconies?: number | null
  daysOnMarket?: number | null
  salePrice?: number | null
  showSalePrice?: boolean
  bedrooms?: number | null
  bathrooms?: number | null
  environments?: number | null
  totalParkingSpots?: number | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  coverImage?: string | null
  /** v1.3: até 5 fotos para o carrossel do card (URLs ou objetos { url, thumbnailUrl } do Prisma) */
  images?: Array<string | { url: string; thumbnailUrl?: string | null }> | null
  createdAt: Date | string
  isNew?: boolean // cadastrado nos últimos 30 dias
  /** v1.3: última entrada do priceHistory menor que a anterior */
  priceReduced?: boolean
  /** v1.3: empreendimento em lançamento */
  isLaunch?: boolean
  /** v1.3: WhatsApp do corretor (botão no card) */
  whatsapp?: string | null
  /** v1.3: primeira dobra → carrega a capa com prioridade */
  priority?: boolean
  className?: string
}

const MAX_CARD_IMAGES = 5

function PropertyCardComponent({
  id,
  slug,
  propertyRef,
  title,
  propertyType,
  transactionType,
  status,
  price,
  totalArea,
  usefulArea,
  suites,
  balconies,
  daysOnMarket,
  salePrice,
  showSalePrice,
  bedrooms,
  bathrooms,
  environments,
  totalParkingSpots,
  neighborhood,
  city,
  state,
  zipCode,
  coverImage,
  images,
  isNew,
  priceReduced,
  isLaunch,
  whatsapp,
  priority,
  className,
}: PropertyCardProps) {
  const photos = (images && images.length
    ? images.map(i => (typeof i === 'string' ? i : (i.thumbnailUrl ?? i.url)))
    : coverImage ? [coverImage] : []
  ).filter(Boolean).slice(0, MAX_CARD_IMAGES)
  const [idx, setIdx] = useState(0)
  const [fav, setFav] = useState(false)

  useEffect(() => {
    setFav(isFavorite(id))
    return subscribe(FAVORITES_KEY, list => setFav(list.includes(id)))
  }, [id])

  // v1.1: "Vendido em 23 dias" / "Alugado em 2 meses e 5 dias"
  const soldLabel = (base: string) => daysOnMarket != null ? `${base} em ${formatDuration(daysOnMarket)}` : base
  const isSold = status === 'SOLD' || status === 'RENTED'

  const badges: Array<{ label: string; className: string }> = []
  if (status === 'SOLD') badges.push({ label: soldLabel('Vendido'), className: 'bg-red-500 text-white' })
  else if (status === 'RENTED') badges.push({ label: soldLabel('Alugado'), className: 'bg-orange-500 text-white' })
  else {
    if (isLaunch) badges.push({ label: 'Lançamento', className: 'bg-[#ea580c] text-white' })
    if (priceReduced) badges.push({ label: 'Preço reduzido', className: 'bg-emerald-600 text-white' })
    if (isNew) badges.push({ label: 'Novo', className: 'bg-[#1e3a8a] text-white' })
    if (!badges.length && transactionType === 'RENT') badges.push({ label: 'Para alugar', className: 'bg-green-600 text-white' })
  }

  const locationParts = [neighborhood, city, state].filter(Boolean)
  const addressLine = locationParts.join(', ')
  const area = usefulArea ?? totalArea
  const sqm = price && area && area > 10 ? price / area : null
  const wa = whatsapp ? waHref(whatsapp, `Olá! Tenho interesse no imóvel ${propertyRef ?? ''} — ${title ?? propertyType ?? 'Imóvel'} (${addressLine}).`) : null

  const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation() }

  return (
    <article
      className={cn(
        'group relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1',
        className
      )}
    >
      {/* Link de cobertura: o card inteiro abre o imóvel; botões internos ficam acima (z-20) */}
      <Link href={`/imoveis/${slug}`} className="absolute inset-0 z-10" aria-label={`Ver imóvel: ${title ?? propertyType ?? 'Imóvel'} em ${addressLine}`}><span className="sr-only">Ver imóvel</span></Link>
      {/* Imagem / carrossel */}
      <div className="relative h-52 overflow-hidden bg-gray-100">
        {photos.length ? (
          photos.map((src, i) => (
            <Image
              key={src + i}
              src={src}
              alt={i === 0 ? (title ?? (propertyType && city ? `${propertyType} em ${city}` : 'Imóvel')) : ''}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
              className={cn('object-cover transition-opacity duration-300', i === idx ? 'opacity-100' : 'opacity-0', i === 0 && 'group-hover:scale-105 transition-transform duration-500')}
              loading={priority && i === 0 ? 'eager' : 'lazy'}
              priority={priority && i === 0}
            />
          ))
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1e3a8a]/10 to-[#2563eb]/10">
            <LayoutGrid className="w-12 h-12 text-[#1e3a8a]/30" />
          </div>
        )}
        {/* Gradiente escuro de baixo */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {photos.length > 1 && (
          <>
            <button type="button" aria-label="Foto anterior" onClick={e => { stop(e); setIdx(i => (i - 1 + photos.length) % photos.length) }} className="absolute z-20 left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/85 text-[#1e3a8a] flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" aria-label="Próxima foto" onClick={e => { stop(e); setIdx(i => (i + 1) % photos.length) }} className="absolute z-20 right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/85 text-[#1e3a8a] flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 right-3 flex gap-1" aria-hidden="true">
              {photos.map((_, i) => <span key={i} className={cn('h-1.5 rounded-full transition-all', i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/60')} />)}
            </div>
          </>
        )}

        {/* Selos */}
        {badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-col items-start gap-1">
            {badges.map(b => (
              <span key={b.label} className={cn('px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm', b.className)}>{b.label}</span>
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="absolute z-20 top-3 right-3 flex gap-1.5">
          <button
            type="button"
            aria-label={fav ? 'Remover dos favoritos' : 'Favoritar imóvel'}
            aria-pressed={fav}
            onClick={e => { stop(e); setFav(toggleFavorite(id)) }}
            className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
          >
            <Heart className={cn('w-4 h-4 transition-colors', fav ? 'text-red-500 fill-red-500' : 'text-gray-500 hover:text-red-500')} />
          </button>
          <button
            type="button"
            aria-label="Compartilhar imóvel"
            onClick={e => { stop(e); void shareLink({ url: `${window.location.origin}/imoveis/${slug}`, title: title ?? propertyType ?? 'Imóvel' }) }}
            className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
          >
            <Share2 className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Preço sobre a imagem (imóvel vendido: valor final só se o corretor liberar) */}
        {isSold ? (
          <div className="absolute bottom-3 left-3">
            <p className="text-white font-bold text-lg drop-shadow">
              {showSalePrice && salePrice ? formatCurrency(salePrice) : (status === 'RENTED' ? 'Alugado' : 'Vendido')}
              {showSalePrice && salePrice && transactionType === 'RENT' && <span className="text-sm font-normal">/mês</span>}
            </p>
          </div>
        ) : price ? (
          <div className="absolute bottom-3 left-3">
            <p className="text-white font-bold text-lg drop-shadow leading-tight">
              {formatCurrency(price)}
              {transactionType === 'RENT' && <span className="text-sm font-normal">/mês</span>}
            </p>
            {sqm && <p className="text-white/85 text-[11px] drop-shadow">{formatCurrency(Math.round(sqm))}/m²</p>}
          </div>
        ) : null}
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Ícones de dados */}
        <div className="flex items-center gap-3 text-gray-500 text-xs flex-wrap">
          {(bedrooms ?? 0) > 0 && (
            <span className="flex items-center gap-1" aria-label={`${bedrooms} dormitórios`}>
              <Bed className="w-3.5 h-3.5 text-[#2563eb]" />
              {bedrooms}
            </span>
          )}
          {(suites ?? 0) > 0 && (
            <span className="flex items-center gap-1" aria-label={`${suites} suítes`}>
              <BedDouble className="w-3.5 h-3.5 text-[#2563eb]" />
              {suites}
            </span>
          )}
          {(bathrooms ?? 0) > 0 && (
            <span className="flex items-center gap-1" aria-label={`${bathrooms} banheiros`}>
              <Bath className="w-3.5 h-3.5 text-[#2563eb]" />
              {bathrooms}
            </span>
          )}
          {(environments ?? 0) > 0 && (
            <span className="flex items-center gap-1" aria-label={`${environments} ambientes`}>
              <LayoutGrid className="w-3.5 h-3.5 text-[#2563eb]" />
              {environments}
            </span>
          )}
          {area ? (
            <span className="flex items-center gap-1" aria-label={`${area} m² útil`}>
              <Maximize2 className="w-3.5 h-3.5 text-[#2563eb]" />
              {area} m²
            </span>
          ) : null}
          <span className="flex items-center gap-1" aria-label={`${totalParkingSpots ?? 0} vagas`}>
            <Car className="w-3.5 h-3.5 text-[#2563eb]" />
            {totalParkingSpots ?? 0} {(totalParkingSpots ?? 0) === 1 ? 'vaga' : 'vagas'}
          </span>
          {(balconies ?? 0) > 0 && (
            <span className="flex items-center gap-1" aria-label={`${balconies} varandas`}>
              <Sun className="w-3.5 h-3.5 text-[#2563eb]" />
              {balconies} {balconies === 1 ? 'varanda' : 'varandas'}
            </span>
          )}
        </div>

        {/* Tipo e endereço */}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#2563eb] uppercase tracking-wide mb-0.5">
            {propertyType ?? (transactionType === 'RENT' ? 'Para alugar' : 'Para venda')}
          </p>
          {addressLine && (
            <p className="text-sm text-gray-600 truncate">{addressLine}</p>
          )}
          <p className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
            {propertyRef && <span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" /> Cód. {propertyRef}</span>}
            {zipCode && <span>{zipCode}</span>}
          </p>
        </div>

        {wa && !isSold && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="relative z-20 mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#25D366] text-[#128C7E] px-3 py-1.5 text-xs font-semibold hover:bg-[#25D366] hover:text-white transition-colors"
            aria-label={`Falar no WhatsApp sobre o imóvel ${propertyRef ?? ''}`}
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
        )}
      </div>
    </article>
  )
}

export const PropertyCard = memo(PropertyCardComponent)
