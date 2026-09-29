'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/components/public/Analytics'

interface ViewCounterProps {
  propertyId: string
  propertyRef?: string
  title?: string | null
  price?: number | null
  city?: string | null
}

export function ViewCounter({ propertyId, propertyRef, title, price, city }: ViewCounterProps) {
  const pathname = usePathname()

  useEffect(() => {
    // view_item para GA4/Pixel a cada visualização do imóvel
    trackEvent('view_item', {
      currency: 'BRL',
      value: price ?? undefined,
      items: [{ item_id: propertyRef ?? propertyId, item_name: title ?? undefined, item_category: city ?? undefined, price: price ?? undefined }],
    })
    // Evitar contar a mesma visita usando sessionStorage
    const key = `view_${propertyId}`
    if (sessionStorage.getItem(key)) return

    sessionStorage.setItem(key, '1')

    fetch(`/api/imoveis/${propertyId}/view`, { method: 'POST' }).catch(() => {})
  // pathname é incluído para re-registrar em navegações client-side
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, pathname])

  return null
}
