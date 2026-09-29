'use client'

import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PropertyCard, type PropertyCardProps } from './PropertyCard'
import { cn } from '@/lib/utils'

// v1.3: mesmas props do card (fotos, código, selos)
type Property = Omit<PropertyCardProps, 'className'>

interface PropertyCarouselProps {
  properties: Property[]
}

export function PropertyCarousel({ properties }: PropertyCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)

  const cardWidth = 320 + 24 // card + gap

  function updateScrollState() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    setActiveIndex(Math.round(el.scrollLeft / cardWidth))
  }

  function scrollBy(direction: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction === 'right' ? cardWidth * 2 : -cardWidth * 2, behavior: 'smooth' })
  }

  const dotsCount = Math.ceil(properties.length / 2)

  return (
    <div className="relative">
      {/* Setas */}
      <button
        type="button"
        onClick={() => scrollBy('left')}
        aria-label="Imóveis anteriores"
        disabled={!canScrollLeft}
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10',
          'w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center',
          'transition-all duration-200',
          canScrollLeft ? 'opacity-100 hover:bg-gray-50' : 'opacity-0 pointer-events-none'
        )}
      >
        <ChevronLeft className="w-5 h-5 text-[#1e3a8a]" />
      </button>

      <button
        type="button"
        onClick={() => scrollBy('right')}
        aria-label="Próximos imóveis"
        disabled={!canScrollRight}
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10',
          'w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center',
          'transition-all duration-200',
          canScrollRight ? 'opacity-100 hover:bg-gray-50' : 'opacity-0 pointer-events-none'
        )}
      >
        <ChevronRight className="w-5 h-5 text-[#1e3a8a]" />
      </button>

      {/* Carrossel */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-6 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        aria-label="Carrossel de imóveis"
      >
        {properties.map(property => (
          <div
            key={property.id}
            className="flex-shrink-0 w-[280px] sm:w-[320px] snap-start"
          >
            <PropertyCard {...property} />
          </div>
        ))}
      </div>

      {/* Dots de paginação */}
      {dotsCount > 1 && (
        <div className="flex justify-center gap-2 mt-6" aria-label="Posição no carrossel">
          {Array.from({ length: dotsCount }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para posição ${i + 1}`}
              aria-current={Math.floor(activeIndex / 2) === i}
              onClick={() => {
                const el = scrollRef.current
                if (el) {
                  el.scrollTo({ left: i * cardWidth * 2, behavior: 'smooth' })
                }
              }}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                Math.floor(activeIndex / 2) === i
                  ? 'w-6 bg-[#1e3a8a]'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
