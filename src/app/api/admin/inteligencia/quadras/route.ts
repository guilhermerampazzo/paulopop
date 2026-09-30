export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { readJsonObject } from '@/lib/json-body'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole } from '@/lib/authz'
import { ensureSeedLoaded } from '@/lib/intel/db'
import { parseQuadraRefs, defaultSearchTerms } from '@/lib/intel/quadras'
import { stripHtml, limitString } from '@/lib/sanitize'

const txt = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? limitString(stripHtml(v).trim(), max) || null : null)
const terms = (v: unknown) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,\n;]/) : []).map(x => txt(x, 60)).filter((x): x is string => !!x).slice(0, 12)
const coord = (v: unknown, min: number, max: number) => { const n = Number(v); return v === '' || v === null || v === undefined || !Number.isFinite(n) || n < min || n > max ? null : n }

/** GET — base de endereços por quadra (Área de Inteligência). Carrega a base de Samambaia no primeiro acesso. */
export async function GET(req: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  await ensureSeedLoaded()
  const sp = req.nextUrl.searchParams
  const city = sp.get('cidade') || undefined
  const q = (sp.get('q') ?? '').trim()
  const rows = await prisma.intelQuadra.findMany({
    where: { city, ...(q ? { OR: [{ quadra: { contains: q, mode: 'insensitive' } }, { sector: { contains: q, mode: 'insensitive' } }, { searchTerms: { has: q } }] } : {}) },
    orderBy: [{ city: 'asc' }, { series: 'asc' }, { number: 'asc' }, { quadra: 'asc' }], take: 1000,
  })
  const cities = await prisma.intelQuadra.groupBy({ by: ['city'], _count: { _all: true } })
  return NextResponse.json({ quadras: rows, cities: cities.map(c => ({ city: c.city, count: c._count._all })) })
}

/** POST — acrescenta uma quadra (administrador). Serve para ampliar a base para outras cidades do DF. */
export async function POST(req: NextRequest) {
  const auth = await requireRole()
  if (auth.response) return auth.response
  const b = await readJsonObject(req) as Record<string, unknown>
  const city = txt(b.city, 80), quadra = txt(b.quadra, 40)
  if (!city || !quadra) return NextResponse.json({ error: 'Informe a cidade e o nome da quadra (ex.: QR 303).' }, { status: 400 })
  const ref = parseQuadraRefs(quadra)[0]
  const exists = await prisma.intelQuadra.findUnique({ where: { city_quadra: { city, quadra } }, select: { id: true } })
  if (exists) return NextResponse.json({ error: 'Esta quadra já está na base.' }, { status: 409 })
  const given = terms(b.searchTerms)
  const row = await prisma.intelQuadra.create({
    data: {
      city, quadra, prefix: ref?.prefix ?? null, number: ref?.number ?? null, series: ref ? Math.floor(ref.number / 100) * 100 : null, sector: txt(b.sector, 80), type: txt(b.type, 60),
      searchTerms: given.length ? given : defaultSearchTerms({ quadra, prefix: ref?.prefix, number: ref?.number }), notes: txt(b.notes, 1000),
      latitude: coord(b.latitude, -90, 90), longitude: coord(b.longitude, -180, 180),
    },
  })
  return NextResponse.json(row, { status: 201 })
}

/** PUT — corrige termos de busca, observações, coordenadas ou desativa uma quadra (administrador). */
export async function PUT(req: NextRequest) {
  const auth = await requireRole()
  if (auth.response) return auth.response
  const b = await readJsonObject(req) as Record<string, unknown>
  const id = txt(b.id, 60)
  if (!id) return NextResponse.json({ error: 'Quadra não informada.' }, { status: 400 })
  const data: Record<string, unknown> = {}
  if ('searchTerms' in b) data.searchTerms = terms(b.searchTerms)
  if ('notes' in b) data.notes = txt(b.notes, 1000)
  if ('sector' in b) data.sector = txt(b.sector, 80)
  if ('active' in b) data.active = Boolean(b.active)
  if ('latitude' in b) data.latitude = coord(b.latitude, -90, 90)
  if ('longitude' in b) data.longitude = coord(b.longitude, -180, 180)
  try {
    return NextResponse.json(await prisma.intelQuadra.update({ where: { id }, data }))
  } catch {
    return NextResponse.json({ error: 'Quadra não encontrada.' }, { status: 404 })
  }
}
