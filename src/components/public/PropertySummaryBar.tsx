'use client'

/**
 * v1.3 — Barra de resumo do imóvel: sticky no topo (desktop) e fixa embaixo (celular).
 * Preço, parcela estimada, quartos/vagas/área, WhatsApp, "Agendar visita", favoritar,
 * comparar (até 3), compartilhar e imprimir. Favoritos/comparação em localStorage (try/catch).
 */
import { useEffect, useState } from 'react'
import { Bed, Car, Maximize2, Heart, Scale, Share2, MessageCircle, CalendarClock, Printer, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { estimateMonthly } from '@/lib/finance'
import { isFavorite, toggleFavorite, isCompared, toggleCompare, subscribe, FAVORITES_KEY, COMPARE_KEY, COMPARE_MAX } from '@/lib/favorites'
import { shareLink, waHref } from '@/lib/share'
import { trackEvent } from '@/components/public/Analytics'
import { cn } from '@/lib/utils'

interface Props {
  propertyId: string
  propertyRef: string
  /** URL absoluta da página (evita divergência SSR/cliente) */
  url: string
  title: string
  price: number | null
  hidePrice?: boolean
  transactionType: string
  bedrooms?: number | null
  parking?: number | null
  area?: number | null
  whatsapp: string
}

export function PropertySummaryBar({ propertyId, propertyRef, url, title, price, hidePrice, transactionType, bedrooms, parking, area, whatsapp }: Props) {
  const [fav, setFav] = useState(false)
  const [cmp, setCmp] = useState(false)
  const [cmpCount, setCmpCount] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setFav(isFavorite(propertyId))
    setCmp(isCompared(propertyId))
    setCmpCount(subscribeCount())
    const u1 = subscribe(FAVORITES_KEY, list => setFav(list.includes(propertyId)))
    const u2 = subscribe(COMPARE_KEY, list => { setCmp(list.includes(propertyId)); setCmpCount(list.length) })
    return () => { u1(); u2() }
    function subscribeCount() { try { return JSON.parse(localStorage.getItem(COMPARE_KEY) ?? '[]').length } catch { return 0 } }
  }, [propertyId])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const showPrice = price != null && price > 0 && !hidePrice
  const monthly = transactionType === 'SALE' && showPrice ? estimateMonthly(price) : null
  const pageUrl = url

  const waMsg = `Olá! Tenho interesse no imóvel ${propertyRef} — ${title}. ${pageUrl}`
  const visitMsg = `Olá! Quero agendar uma visita ao imóvel ${propertyRef} — ${title}. Melhor horário: `
  const wa = waHref(whatsapp, waMsg)
  const waVisit = waHref(whatsapp, visitMsg)

  const onFav = () => {
    const now = toggleFavorite(propertyId)
    setFav(now)
    setToast(now ? 'Salvo nos favoritos' : 'Removido dos favoritos')
    trackEvent(now ? 'add_to_wishlist' : 'remove_from_wishlist', { items: [{ item_id: propertyRef }] })
  }
  const onCompare = () => {
    const r = toggleCompare(propertyId)
    if (!r.ok) { setToast(`Você já compara ${COMPARE_MAX} imóveis`); return }
    setCmp(r.active)
    setCmpCount(r.list.length)
    setToast(r.active ? `Adicionado à comparação (${r.list.length}/${COMPARE_MAX})` : 'Removido da comparação')
  }
  const onShare = async () => {
    const r = await shareLink({ url: pageUrl, title, text: `${title} — ${propertyRef}` })
    if (r === 'copied') setToast('Link copiado')
    trackEvent('share', { content_type: 'property', item_id: propertyRef })
  }
  const onPrint = () => { try { window.print() } catch { /* ignore */ } }

  const priceNode = showPrice ? (
    <p className="font-display text-xl md:text-2xl font-bold text-[#1e3a8a] leading-tight">
      {formatCurrency(price)}{transactionType === 'RENT' && <span className="text-sm font-normal text-gray-500">/mês</span>}
    </p>
  ) : (
    <p className="font-display text-lg font-bold text-[#1e3a8a]">Consulte o valor</p>
  )

  const iconBtn = 'inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:border-[#1e3a8a] hover:text-[#1e3a8a]'

  return (
    <>
      {/* Desktop: sticky no topo */}
      <div className="hidden md:block sticky top-[100px] z-30 print:hidden" data-has-own-bar="true">
        <div className="bg-white/95 backdrop-blur border border-gray-100 shadow-[0_12px_40px_-24px_rgba(8,30,63,0.5)] rounded-2xl px-5 py-3 flex items-center gap-6">
          <div className="min-w-0">
            {priceNode}
            {monthly && <p className="text-xs text-gray-500">a partir de <strong className="text-[#1e3a8a]">{formatCurrency(Math.round(monthly))}/mês</strong> · entrada 20%</p>}
          </div>
          <ul className="flex items-center gap-4 text-sm text-gray-600 border-l border-gray-200 pl-6">
            {(bedrooms ?? 0) > 0 && <li className="flex items-center gap-1.5"><Bed className="w-4 h-4 text-[#2563eb]" />{bedrooms} {bedrooms === 1 ? 'quarto' : 'quartos'}</li>}
            {(parking ?? 0) > 0 && <li className="flex items-center gap-1.5"><Car className="w-4 h-4 text-[#2563eb]" />{parking} {parking === 1 ? 'vaga' : 'vagas'}</li>}
            {(area ?? 0) > 0 && <li className="flex items-center gap-1.5"><Maximize2 className="w-4 h-4 text-[#2563eb]" />{Math.round(area!)} m²</li>}
          </ul>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onFav} aria-label={fav ? 'Remover dos favoritos' : 'Favoritar imóvel'} aria-pressed={fav} className={cn(iconBtn, fav && 'border-red-200 text-red-500')}>
              <Heart className={cn('w-4 h-4', fav && 'fill-red-500')} />
            </button>
            <button type="button" onClick={onCompare} aria-label={cmp ? 'Remover da comparação' : 'Comparar imóvel'} aria-pressed={cmp} className={cn(iconBtn, 'relative', cmp && 'border-[#1e3a8a] text-[#1e3a8a]')}>
              <Scale className="w-4 h-4" />
              {cmpCount > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-[#ea580c] px-1 text-[10px] font-bold text-white leading-4">{cmpCount}</span>}
            </button>
            <button type="button" onClick={onShare} aria-label="Compartilhar imóvel" className={iconBtn}><Share2 className="w-4 h-4" /></button>
            <button type="button" onClick={onPrint} aria-label="Imprimir ficha do imóvel" className={iconBtn}><Printer className="w-4 h-4" /></button>
            {waVisit && (
              <a href={waVisit} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[#1e3a8a] px-4 py-2 text-sm font-semibold text-[#1e3a8a] hover:bg-[#eff6ff]">
                <CalendarClock className="w-4 h-4" /> Agendar visita
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1ebe57]">
                <MessageCircle className="w-4 h-4" fill="white" strokeWidth={0} /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Celular: barra fixa inferior */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-[0_-8px_30px_-16px_rgba(8,30,63,0.4)] print:hidden" data-has-own-bar="true" role="complementary" aria-label="Resumo e contato">
        <div className="px-4 py-2.5 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {priceNode}
            {monthly ? (
              <p className="text-[11px] text-gray-500 truncate">≈ {formatCurrency(Math.round(monthly))}/mês</p>
            ) : (
              <p className="text-[11px] text-gray-500 truncate">{[bedrooms ? `${bedrooms} q` : null, parking ? `${parking} vg` : null, area ? `${Math.round(area)} m²` : null].filter(Boolean).join(' · ')}</p>
            )}
          </div>
          <button type="button" onClick={onFav} aria-label={fav ? 'Remover dos favoritos' : 'Favoritar imóvel'} aria-pressed={fav} className={cn(iconBtn, 'h-9 w-9', fav && 'border-red-200 text-red-500')}>
            <Heart className={cn('w-4 h-4', fav && 'fill-red-500')} />
          </button>
          <button type="button" onClick={onShare} aria-label="Compartilhar imóvel" className={cn(iconBtn, 'h-9 w-9')}><Share2 className="w-4 h-4" /></button>
          {waVisit && (
            <a href={waVisit} target="_blank" rel="noopener noreferrer" aria-label="Agendar visita pelo WhatsApp" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#1e3a8a] text-[#1e3a8a]">
              <CalendarClock className="w-4 h-4" />
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-2 text-sm font-semibold text-white">
              <MessageCircle className="w-4 h-4" fill="white" strokeWidth={0} /> WhatsApp
            </a>
          )}
        </div>
      </div>

      {toast && (
        <div role="status" aria-live="polite" className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 z-[60] inline-flex items-center gap-2 rounded-full bg-[#172554] px-4 py-2 text-sm text-white shadow-lg print:hidden">
          <Check className="w-4 h-4 text-[#93c5fd]" /> {toast}
        </div>
      )}
    </>
  )
}
