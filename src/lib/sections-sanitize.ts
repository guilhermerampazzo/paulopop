/**
 * v1.3 — Limpeza das seções vindas do painel antes de gravar no banco.
 * `parseSections` garante a estrutura; aqui cada HTML passa por `sanitizeHtml`
 * e os textos simples perdem tags.
 */
import { parseSections, type Section, type MediaImage } from './sections'
import { sanitizeHtml, stripHtml, limitString } from './sanitize'

const SAFE_URL = /^(https?:\/\/|\/(?!\/))/i

const txt = (v: unknown, max = 500) => limitString(stripHtml(String(v ?? '')), max).trim()
const url = (v: unknown) => {
  const s = String(v ?? '').trim()
  return s && SAFE_URL.test(s) ? limitString(s, 2000) : ''
}
const optUrl = (v: unknown) => url(v) || undefined
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const images = (arr: unknown): MediaImage[] => (Array.isArray(arr) ? arr : [])
  .filter(i => i && typeof i === 'object' && url((i as MediaImage).url))
  .slice(0, 60)
  .map(i => ({ url: url((i as MediaImage).url), caption: txt((i as MediaImage).caption, 300) || undefined, alt: txt((i as MediaImage).alt, 200) || undefined }))
const names = (arr: unknown) => (Array.isArray(arr) ? arr : []).map(v => txt(v, 80)).filter(Boolean).slice(0, 30)
const ids = (arr: unknown) => (Array.isArray(arr) ? arr : []).map(v => String(v ?? '').trim()).filter(v => /^[\w-]{1,64}$/.test(v)).slice(0, 60)
const list = <T>(arr: unknown, max: number): T[] => (Array.isArray(arr) ? (arr as T[]).filter(x => x && typeof x === 'object') : []).slice(0, max)
const idOf = (o: { id?: unknown }, i: number) => txt(o.id, 40) || `e${i}`

export function sanitizeSections(input: unknown): Section[] {
  return parseSections(input).map((s): Section => {
    const base = {
      id: s.id,
      title: txt(s.title, 200) || undefined,
      subtitle: txt(s.subtitle, 300) || undefined,
      visible: s.visible !== false,
      anchor: txt(s.anchor, 80).toLowerCase().replace(/[^a-z0-9-]/g, '') || undefined,
    }
    switch (s.type) {
      case 'text':
        return { ...base, type: 'text', html: sanitizeHtml(String(s.html ?? '')), imageUrl: optUrl(s.imageUrl), imagePosition: (['left', 'right', 'top'] as const).find(p => p === s.imagePosition) }
      case 'gallery':
        return { ...base, type: 'gallery', images: images(s.images), layout: (['grid', 'carousel', 'masonry'] as const).find(l => l === s.layout) ?? 'grid' }
      case 'video':
        return { ...base, type: 'video', url: url(s.url), caption: txt(s.caption, 300) || undefined, vertical: !!s.vertical }
      case 'items':
        return {
          ...base, type: 'items',
          layout: s.layout === 'list' ? 'list' : 'cards',
          columns: ([2, 3, 4] as const).find(c => c === s.columns) ?? 3,
          items: list<Section & { id?: unknown }>(s.items, 60).map((raw, i) => {
            const it = raw as unknown as Record<string, unknown>
            return {
              id: idOf(it, i), title: txt(it.title, 200), text: sanitizeHtml(String(it.text ?? '')).slice(0, 4000) || undefined,
              imageUrl: optUrl(it.imageUrl), link: optUrl(it.link), address: txt(it.address, 300) || undefined, mapUrl: optUrl(it.mapUrl),
              phone: txt(it.phone, 40) || undefined, badge: txt(it.badge, 60) || undefined, videoUrl: optUrl(it.videoUrl),
              images: it.images ? images(it.images) : undefined,
            }
          }),
        }
      case 'timeline':
        return { ...base, type: 'timeline', entries: list<Record<string, unknown>>(s.entries, 60).map((e, i) => ({ id: idOf(e, i), year: txt(e.year, 20), title: txt(e.title, 200), text: sanitizeHtml(String(e.text ?? '')).slice(0, 4000) || undefined, imageUrl: optUrl(e.imageUrl) })) }
      case 'people':
        return { ...base, type: 'people', people: list<Record<string, unknown>>(s.people, 60).map((p, i) => ({ id: idOf(p, i), name: txt(p.name, 150), role: txt(p.role, 150) || undefined, period: txt(p.period, 80) || undefined, text: sanitizeHtml(String(p.text ?? '')).slice(0, 4000) || undefined, imageUrl: optUrl(p.imageUrl), link: optUrl(p.link) })) }
      case 'stats':
        return { ...base, type: 'stats', stats: list<Record<string, unknown>>(s.stats, 20).map((e, i) => ({ id: idOf(e, i), label: txt(e.label, 80), value: txt(e.value, 80), source: txt(e.source, 200) || undefined })) }
      case 'map':
        return { ...base, type: 'map', embedUrl: optUrl(s.embedUrl), text: txt(s.text, 1000) || undefined, pins: list<Record<string, unknown>>(s.pins, 60).map((p, i) => ({ id: idOf(p, i), name: txt(p.name, 150), address: txt(p.address, 300) || undefined, lat: num(p.lat), lng: num(p.lng), category: txt(p.category, 60) || undefined })) }
      case 'properties':
        return { ...base, type: 'properties', mode: s.mode === 'manual' ? 'manual' : 'auto', transactionType: (['SALE', 'RENT', 'ALL'] as const).find(t => t === s.transactionType) ?? 'ALL', cityNames: names(s.cityNames), propertyIds: ids(s.propertyIds), limit: Math.min(24, Math.max(1, num(s.limit) ?? 8)) }
      case 'empreendimentos':
        return { ...base, type: 'empreendimentos', mode: s.mode === 'manual' ? 'manual' : 'auto', cityNames: names(s.cityNames), empreendimentoIds: ids(s.empreendimentoIds), limit: Math.min(24, Math.max(1, num(s.limit) ?? 6)) }
      case 'cta':
        return { ...base, type: 'cta', text: txt(s.text, 500) || undefined, buttonLabel: txt(s.buttonLabel, 60) || undefined, whatsappMessage: txt(s.whatsappMessage, 300) || undefined, showForm: !!s.showForm, style: (['orange', 'blue', 'light'] as const).find(v => v === s.style) ?? 'orange' }
      case 'faq':
        return { ...base, type: 'faq', entries: list<Record<string, unknown>>(s.entries, 40).map((e, i) => ({ id: idOf(e, i), question: txt(e.question, 300), answer: sanitizeHtml(String(e.answer ?? '')).slice(0, 4000) })) }
      case 'blog':
        return { ...base, type: 'blog', citySlug: txt(s.citySlug, 80) || undefined, tag: txt(s.tag, 80) || undefined, limit: Math.min(12, Math.max(1, num(s.limit) ?? 3)) }
    }
  })
}
