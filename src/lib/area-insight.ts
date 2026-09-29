/**
 * v1.3 — "Viver aqui": pesquisa de região a partir do endereço.
 * Geocoding + Places API (New) + Routes API do Google. Sem chave → provider 'manual' (o corretor preenche à mão).
 * O resultado fica em cache no banco (AreaInsight) por 90 dias e é reaproveitado por imóveis, empreendimentos e cidades.
 */
import { prisma } from './prisma'
import { distanceKm } from './market-study'
import { CATEGORIES, normalizeAddressKey, schoolKind, minutes, type AreaPlace, type AreaRoute, type AreaData } from './area-insight-shared'

export * from './area-insight-shared'

const DESTINATIONS = [
  { name: 'Esplanada dos Ministérios (Plano Piloto)', lat: -15.7989, lng: -47.8645 },
  { name: 'Taguatinga Centro', lat: -15.8330, lng: -48.0570 },
  { name: 'Águas Claras (estação)', lat: -15.8347, lng: -48.0269 },
  { name: 'Aeroporto de Brasília', lat: -15.8711, lng: -47.9186 },
]




function apiKey(): string | null {
  return process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || null
}

export async function geocode(address: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
  const key = apiKey()
  if (!key) return null
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=br&language=pt-BR&key=${key}`
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
  const j = await res.json().catch(() => null) as { results?: Array<{ geometry: { location: { lat: number; lng: number } }; formatted_address: string }> } | null
  const r = j?.results?.[0]
  return r ? { lat: r.geometry.location.lat, lng: r.geometry.location.lng, formatted: r.formatted_address } : null
}

async function nearby(lat: number, lng: number, types: string[], key: string): Promise<AreaPlace[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType' },
    body: JSON.stringify({ includedTypes: types, maxResultCount: 12, languageCode: 'pt-BR', locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 1500 } } }),
  })
  const j = await res.json().catch(() => null) as { places?: Array<{ id: string; displayName?: { text: string }; formattedAddress?: string; location: { latitude: number; longitude: number }; rating?: number; userRatingCount?: number; types?: string[] }> } | null
  return (j?.places ?? []).map(p => {
    const d = Math.round(distanceKm(lat, lng, p.location.latitude, p.location.longitude) * 1000)
    return { id: p.id, name: p.displayName?.text ?? '—', address: p.formattedAddress, lat: p.location.latitude, lng: p.location.longitude, distanceM: d, walkMin: minutes(d, 'walk'), driveMin: minutes(d, 'drive'), rating: p.rating ?? null, ratings: p.userRatingCount ?? null, types: p.types }
  }).sort((a, b) => a.distanceM - b.distanceM).slice(0, 8)
}

function nextWeekdayPeak(): string {
  const d = new Date()
  d.setUTCHours(10, 30, 0, 0) // 7h30 em Brasília (UTC-3)
  do { d.setUTCDate(d.getUTCDate() + 1) } while (d.getUTCDay() === 0 || d.getUTCDay() === 6)
  return d.toISOString()
}

async function route(lat: number, lng: number, dest: { name: string; lat: number; lng: number }, key: string): Promise<AreaRoute> {
  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters' },
      body: JSON.stringify({ origin: { location: { latLng: { latitude: lat, longitude: lng } } }, destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } }, travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE', departureTime: nextWeekdayPeak(), languageCode: 'pt-BR' }),
    })
    const j = await res.json().catch(() => null) as { routes?: Array<{ duration: string; distanceMeters: number }> } | null
    const r = j?.routes?.[0]
    if (!r) return { destination: dest.name, km: null, minutes: null }
    return { destination: dest.name, km: Math.round(r.distanceMeters / 100) / 10, minutes: Math.round(parseInt(r.duration) / 60) }
  } catch {
    return { destination: dest.name, km: null, minutes: null }
  }
}

export async function fetchAreaInsight(address: string): Promise<{ provider: 'google' | 'manual'; lat: number | null; lng: number | null; data: AreaData }> {
  const key = apiKey()
  const empty: AreaData = { categories: [], routes: [], fetchedAt: new Date().toISOString() }
  if (!key) return { provider: 'manual', lat: null, lng: null, data: empty }
  const geo = await geocode(address)
  if (!geo) return { provider: 'manual', lat: null, lng: null, data: empty }
  const categories = await Promise.all(CATEGORIES.map(async c => {
    try {
      const places = await nearby(geo.lat, geo.lng, c.types, key)
      if (c.key === 'escolas') for (const p of places) p.schoolKind = schoolKind(p.name)
      return { key: c.key, label: c.label, places }
    } catch { return { key: c.key, label: c.label, places: [] } }
  }))
  const routes = await Promise.all(DESTINATIONS.map(d => route(geo.lat, geo.lng, d, key)))
  return { provider: 'google', lat: geo.lat, lng: geo.lng, data: { categories, routes, fetchedAt: new Date().toISOString() } }
}

const NINETY_DAYS = 90 * 86_400_000

export async function getOrCreateAreaInsight(address: string, opts: { force?: boolean } = {}) {
  const addressKey = normalizeAddressKey(address)
  const existing = await prisma.areaInsight.findUnique({ where: { addressKey } })
  if (existing && !opts.force && existing.fetchedAt && Date.now() - existing.fetchedAt.getTime() < NINETY_DAYS) return existing
  const r = await fetchAreaInsight(address)
  const data = { address, latitude: r.lat, longitude: r.lng, data: r.data as object, provider: r.provider, fetchedAt: new Date() }
  return existing
    ? prisma.areaInsight.update({ where: { id: existing.id }, data: r.provider === 'manual' && existing.provider === 'google' ? { address } : data })
    : prisma.areaInsight.create({ data: { addressKey, ...data } })
}

