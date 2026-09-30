'use client'

/**
 * v1.4 — Ficha impressa: espera as fotos e o mapa carregarem e abre a janela de impressão.
 * O botão continua na tela para imprimir de novo (some no papel).
 */
import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'

export function AutoPrint({ auto = true }: { auto?: boolean }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const imgs = Array.from(document.images)
    const waitAll = Promise.all(imgs.map(img => (img.complete ? Promise.resolve() : new Promise<void>(res => { img.addEventListener('load', () => res(), { once: true }); img.addEventListener('error', () => res(), { once: true }) }))))
    const timeout = new Promise<void>(res => setTimeout(res, 6000))
    void Promise.race([waitAll, timeout]).then(() => {
      if (cancelled) return
      setReady(true)
      if (auto && !new URLSearchParams(window.location.search).has('semimprimir')) {
        setTimeout(() => { try { window.print() } catch { /* ignore */ } }, 300)
      }
    })
    return () => { cancelled = true }
  }, [auto])

  return (
    <button type="button" onClick={() => window.print()} disabled={!ready} className="inline-flex items-center gap-2 rounded-full bg-[#ea580c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#c2410c] disabled:opacity-60">
      <Printer className="h-4 w-4" /> {ready ? 'Imprimir ou salvar em PDF' : 'Preparando a ficha…'}
    </button>
  )
}
