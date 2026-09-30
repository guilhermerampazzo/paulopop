export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { planStaticMap, validCoords, TILE } from '@/lib/static-map'
import { checkRateLimit } from '@/lib/rateLimit'

/**
 * v1.4 — GET /api/mapa-estatico?lat=&lng=&w=&h=&z= → PNG com o mapa (OpenStreetMap) e um marcador.
 * Usado na ficha impressa do imóvel, onde o mapa interativo (iframe) não imprime.
 * Os blocos ficam em cache na memória do servidor; a resposta é cacheável por 7 dias.
 */
const UA = 'corretorpaulopop.com (ficha impressa do imovel; contato pelo site)'
const tileCache = new Map<string, { at: number; buf: Buffer }>()
const TTL = 7 * 24 * 3600 * 1000

async function tile(z: number, x: number, y: number): Promise<Buffer | null> {
  const key = `${z}/${x}/${y}`
  const hit = tileCache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.buf
  try {
    const res = await fetch(`https://tile.openstreetmap.org/${key}.png`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(8000) })
    if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (tileCache.size > 400) tileCache.delete(tileCache.keys().next().value as string)
    tileCache.set(key, { at: Date.now(), buf })
    return buf
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  if (!checkRateLimit(`mapa:${ip}`, 40, 60_000)) return new NextResponse('Muitas requisições', { status: 429 })
  const q = req.nextUrl.searchParams
  const lat = Number(q.get('lat')), lng = Number(q.get('lng'))
  if (!validCoords(lat, lng)) return new NextResponse('Coordenadas inválidas', { status: 400 })
  const z = Math.min(18, Math.max(10, Math.round(Number(q.get('z')) || 16)))
  const width = Math.min(1200, Math.max(200, Math.round(Number(q.get('w')) || 900)))
  const height = Math.min(800, Math.max(150, Math.round(Number(q.get('h')) || 420)))

  const plan = planStaticMap(lat, lng, z, width, height)
  const bufs = await Promise.all(plan.tiles.map(t => tile(z, t.x, t.y)))
  if (bufs.every(b => !b)) return new NextResponse('Mapa indisponível', { status: 502 })

  const sharp = (await import('sharp')).default
  const pin = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52"><path d="M20 1C9.5 1 1 9.4 1 19.8 1 33.5 20 51 20 51s19-17.5 19-31.2C39 9.4 30.5 1 20 1z" fill="#dc1c2e" stroke="#fff" stroke-width="2"/><circle cx="20" cy="20" r="7" fill="#fff"/></svg>`)
  const layers = plan.tiles.flatMap((t, i) => {
    const b = bufs[i]
    if (!b) return []
    // recorta a parte do bloco que cai dentro da imagem (o sharp não aceita posição negativa)
    const sx = Math.max(0, -t.left), sy = Math.max(0, -t.top)
    const w = Math.min(TILE - sx, width - Math.max(0, t.left)), h = Math.min(TILE - sy, height - Math.max(0, t.top))
    if (w <= 0 || h <= 0) return []
    return [{ b, sx, sy, w, h, left: Math.max(0, t.left), top: Math.max(0, t.top) }]
  })
  const cropped = await Promise.all(layers.map(async l => ({ input: await sharp(l.b).extract({ left: l.sx, top: l.sy, width: l.w, height: l.h }).png().toBuffer(), left: l.left, top: l.top })))
  const out = await sharp({ create: { width, height, channels: 3, background: '#e5e7eb' } })
    .composite([...cropped, { input: pin, left: plan.marker.x - 20, top: plan.marker.y - 50 }])
    .png({ compressionLevel: 8 })
    .toBuffer()
  return new NextResponse(new Uint8Array(out), { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000' } })
}
