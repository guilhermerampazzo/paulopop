/**
 * v1.3 — Tipos e utilitários do "Viver aqui" sem dependência de servidor (usados no painel e no site).
 */
export interface AreaPlace {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  distanceM: number
  walkMin: number
  driveMin: number
  rating?: number | null
  ratings?: number | null
  types?: string[]
  schoolKind?: 'publica' | 'particular'
}
export interface AreaCategory { key: string; label: string; places: AreaPlace[] }
export interface AreaRoute { destination: string; km: number | null; minutes: number | null }
export interface AreaData { categories: AreaCategory[]; routes: AreaRoute[]; summary?: string; fetchedAt: string }
export interface AreaManual { highlights?: Array<{ text: string }>; hidden?: string[]; extraPlaces?: Array<{ category: string; name: string; distanceM?: number; address?: string }>; summary?: string }

export const CATEGORIES: Array<{ key: string; label: string; tab: string; types: string[] }> = [
  { key: 'metro', label: 'Metrô e trem', tab: 'Transporte', types: ['subway_station', 'train_station', 'light_rail_station'] },
  { key: 'onibus', label: 'Ônibus e terminais', tab: 'Transporte', types: ['bus_station', 'transit_station', 'bus_stop'] },
  { key: 'supermercado', label: 'Supermercados e padarias', tab: 'Comércio', types: ['supermarket', 'grocery_store', 'bakery'] },
  { key: 'comercio', label: 'Restaurantes, shopping e bancos', tab: 'Comércio', types: ['restaurant', 'shopping_mall', 'bank', 'pharmacy'] },
  { key: 'escolas', label: 'Escolas', tab: 'Escolas', types: ['primary_school', 'secondary_school', 'school', 'preschool'] },
  { key: 'faculdades', label: 'Faculdades e cursos', tab: 'Escolas', types: ['university'] },
  { key: 'saude', label: 'Hospitais, UPA e clínicas', tab: 'Saúde', types: ['hospital', 'doctor', 'dentist', 'physiotherapist'] },
  { key: 'lazer', label: 'Academias, parques e esporte', tab: 'Lazer', types: ['gym', 'park', 'sports_complex', 'fitness_center'] },
]
export const TABS = ['Transporte', 'Comércio', 'Escolas', 'Saúde', 'Lazer']


export function normalizeAddressKey(address: string): string {
  return address.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, '-').slice(0, 200)
}

const PUBLIC_RE = /\b(ced|cef|cem|cei|cil|escola classe|centro de ensino|jardim de inf[âa]ncia|col[ée]gio militar|c[íi]vico[- ]militar|escola parque|centro educacional|caic|ceem|cepi)\b/i
export function schoolKind(name: string): 'publica' | 'particular' {
  return PUBLIC_RE.test(name) ? 'publica' : 'particular'
}

export function minutes(distanceM: number, mode: 'walk' | 'drive'): number {
  const perMin = mode === 'walk' ? 80 : 400
  return Math.max(1, Math.round(distanceM / perMin))
}

/** Junta dados automáticos + ajustes manuais para exibição. */
export function mergeInsight(data: AreaData | null, manual: AreaManual | null): { tabs: Array<{ tab: string; categories: AreaCategory[] }>; routes: AreaRoute[]; highlights: string[]; summary?: string; hasContent: boolean } {
  const hidden = new Set(manual?.hidden ?? [])
  const cats: AreaCategory[] = (data?.categories ?? []).map(c => ({ ...c, places: c.places.filter(p => !hidden.has(p.id)) }))
  for (const e of manual?.extraPlaces ?? []) {
    const c = cats.find(x => x.key === e.category) ?? (() => { const def = CATEGORIES.find(x => x.key === e.category); const n = { key: e.category, label: def?.label ?? e.category, places: [] as AreaPlace[] }; cats.push(n); return n })()
    const d = e.distanceM ?? 0
    c.places.push({ id: `m-${e.name}`, name: e.name, address: e.address, lat: 0, lng: 0, distanceM: d, walkMin: minutes(d, 'walk'), driveMin: minutes(d, 'drive') })
  }
  const tabs = TABS.map(tab => ({ tab, categories: cats.filter(c => CATEGORIES.find(x => x.key === c.key)?.tab === tab && c.places.length) })).filter(t => t.categories.length)
  const highlights = (manual?.highlights ?? []).map(h => h.text).filter(Boolean)
  const routes = (data?.routes ?? []).filter(r => r.minutes != null)
  return { tabs, routes, highlights, summary: manual?.summary || data?.summary, hasContent: tabs.length > 0 || highlights.length > 0 || routes.length > 0 }
}
