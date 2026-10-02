'use client'

/**
 * v1.5 — Busca por mapa em /imoveis (?modo=mapa).
 * Pinos com o preço; ao clicar, um cartão com foto, título e link. "Buscar nesta área" grava o
 * retângulo visível no endereço (?area=sul,oeste,norte,leste) e a lista abaixo passa a mostrar
 * só os imóveis dessa área — mapa e lista usam os mesmos filtros (src/lib/property-filters.ts).
 * Leaflet + OpenStreetMap, carregado só no navegador e só quando o mapa é aberto.
 */
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap, LayerGroup } from 'leaflet'
import { shortPrice, type MapPin } from '@/lib/map-pins'
import { formatArea, parseArea } from '@/lib/property-filters'

interface Props {
  /** query string atual da busca (sem "?") */
  query: string
}

const DF_CENTER: [number, number] = [-15.80, -47.95]

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export function PropertyMapSearch({ query }: Props) {
  const router = useRouter()
  const boxRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerRef = useRef<LayerGroup | null>(null)
  const [state, setState] = useState<{ loading: boolean; error: string | null; total: number; shown: number; capped: boolean; noLocation: number }>({ loading: true, error: null, total: 0, shown: 0, capped: false, noLocation: 0 })
  const [moved, setMoved] = useState(false)

  const params = new URLSearchParams(query)
  const area = parseArea(params.get('area'))

  // cria o mapa uma vez
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !boxRef.current || mapRef.current) return
      const map = L.map(boxRef.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: true })
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(map)
      map.setView(DF_CENTER, 11)
      layerRef.current = L.layerGroup().addTo(map)
      map.on('dragend zoomend', () => setMoved(true))
      mapRef.current = map
      setTimeout(() => map.invalidateSize(), 50)
      void loadPins()
    })()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // recarrega os pinos quando a busca muda
  useEffect(() => {
    if (mapRef.current) void loadPins()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  async function loadPins() {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const qs = new URLSearchParams(query)
      qs.delete('pagina'); qs.delete('modo'); qs.delete('ordem')
      const res = await fetch(`/api/imoveis/mapa?${qs.toString()}`)
      if (!res.ok) throw new Error()
      const d = await res.json() as { pins: MapPin[]; total: number; capped: boolean; withoutLocation: number }
      const L = (await import('leaflet')).default
      const map = mapRef.current
      const layer = layerRef.current
      if (!map || !layer) return
      layer.clearLayers()
      const latlngs: [number, number][] = []
      for (const p of d.pins) {
        const label = esc(shortPrice(p.price, p.transaction))
        const icon = L.divIcon({
          className: 'pp-pin',
          html: `<span class="pp-pin__label">${label}</span>`,
          iconSize: undefined,
          iconAnchor: [0, 0],
        })
        const details = [p.bedrooms ? `${p.bedrooms} ${p.bedrooms === 1 ? 'quarto' : 'quartos'}` : '', p.area ? `${Math.round(p.area)} m²` : ''].filter(Boolean).join(' · ')
        const popup = `
          <a href="/imoveis/${encodeURIComponent(p.slug)}" class="pp-pop">
            ${p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy" />` : ''}
            <span class="pp-pop__price">${p.hidePrice ? 'Preço sob consulta' : label}${p.transaction === 'RENT' ? '<small>/mês</small>' : ''}</span>
            <span class="pp-pop__title">${esc(p.title)}</span>
            ${details ? `<span class="pp-pop__meta">${esc(details)}</span>` : ''}
            ${p.neighborhood ? `<span class="pp-pop__meta">${esc(p.neighborhood)}${p.approx ? ' · localização aproximada' : ''}</span>` : ''}
          </a>`
        L.marker([p.lat, p.lng], { icon, title: `${p.title} — ${shortPrice(p.price, p.transaction)}`, keyboard: true })
          .bindPopup(popup, { maxWidth: 240, minWidth: 220, closeButton: true })
          .addTo(layer)
        latlngs.push([p.lat, p.lng])
      }
      if (area) {
        map.fitBounds([[area.south, area.west], [area.north, area.east]])
      } else if (latlngs.length) {
        map.fitBounds(L.latLngBounds(latlngs).pad(0.15), { maxZoom: 15 })
      }
      setMoved(false)
      setState({ loading: false, error: null, total: d.total, shown: d.pins.length, capped: d.capped, noLocation: d.capped ? 0 : d.withoutLocation })
    } catch {
      setState(s => ({ ...s, loading: false, error: 'Não foi possível carregar o mapa agora. A lista abaixo continua funcionando.' }))
    }
  }

  function searchThisArea() {
    const map = mapRef.current
    if (!map) return
    const b = map.getBounds()
    const next = new URLSearchParams(query)
    next.set('area', formatArea({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }))
    next.set('modo', 'mapa')
    next.delete('pagina')
    router.push(`/imoveis?${next.toString()}`, { scroll: false })
  }

  function clearArea() {
    const next = new URLSearchParams(query)
    next.delete('area')
    next.delete('pagina')
    router.push(`/imoveis?${next.toString()}`, { scroll: false })
  }

  return (
    <section aria-label="Mapa dos imóveis" className="mb-6">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div ref={boxRef} className="h-[360px] w-full sm:h-[460px]" />
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-3">
          {(moved || !area) && !state.loading && (
            <button type="button" onClick={searchThisArea}
              className="pointer-events-auto rounded-full bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-[#172554]">
              Buscar nesta área
            </button>
          )}
        </div>
        {state.loading && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center bg-white/60 text-sm text-gray-600">Carregando o mapa…</div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        {state.error ? <span className="text-red-600">{state.error}</span> : (
          <span>
            {state.shown} {state.shown === 1 ? 'imóvel' : 'imóveis'} no mapa
            {state.noLocation > 0 && ` · ${state.noLocation} sem localização cadastrada (aparecem só na lista)`}
            {state.capped && ' · mostrando os 500 mais recentes; aproxime o mapa ou use os filtros'}
          </span>
        )}
        {area && (
          <button type="button" onClick={clearArea} className="rounded-full border border-gray-300 px-2.5 py-0.5 text-gray-600 hover:border-[#2563eb] hover:text-[#2563eb]">
            Área do mapa ✕
          </button>
        )}
        <span>Clique no preço para ver o imóvel. Pinos com “localização aproximada” não mostram o endereço exato.</span>
      </div>
    </section>
  )
}
