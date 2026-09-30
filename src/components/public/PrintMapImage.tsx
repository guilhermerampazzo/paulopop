'use client'

import { useEffect, useRef, useState } from 'react'

/** v1.4 — mapa da ficha impressa. Se o serviço de mapas não responder, mostra o endereço do anúncio em vez de imagem quebrada. */
export function PrintMapImage({ src, alt, fallbackUrl }: { src: string; alt: string; fallbackUrl: string }) {
  const [failed, setFailed] = useState(false)
  const ref = useRef<HTMLImageElement>(null)
  // a imagem pode ter falhado antes de a página ficar interativa: confere de novo ao montar
  useEffect(() => { const el = ref.current; if (el && el.complete && el.naturalWidth === 0) setFailed(true) }, [])
  if (failed) {
    return <p className="rounded-md border border-dashed border-gray-300 p-3 text-[9pt] text-gray-600" data-testid="mapa-indisponivel">Mapa indisponível no momento. Veja a localização no anúncio: <span className="break-all font-medium">{fallbackUrl}</span></p>
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={ref} src={src} alt={alt} onError={() => setFailed(true)} className="w-full rounded-md border border-gray-200" data-testid="mapa-ficha" />
      <p className="mt-0.5 text-right text-[7pt] text-gray-400">Mapa © colaboradores do OpenStreetMap</p>
    </>
  )
}
