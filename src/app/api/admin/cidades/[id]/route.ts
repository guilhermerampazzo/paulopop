export const dynamic = 'force-dynamic'

/**
 * v1.3 — /api/admin/cidades/[id]: GET, PUT (todos os campos, com sanitização) e DELETE.
 * Acesso: ADMIN / SUPER_ADMIN.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/authz'
import { revalidateSite } from '@/lib/cache'
import { slugify } from '@/lib/utils'
import { limitString, stripHtml } from '@/lib/sanitize'
import { sanitizeSections } from '@/lib/sections-sanitize'

type Params = { params: { id: string } }

const txt = (v: unknown, max = 300) => {
  if (v === undefined) return undefined
  const s = limitString(stripHtml(String(v ?? '')), max).trim()
  return s || null
}
const url = (v: unknown) => {
  if (v === undefined) return undefined
  const s = String(v ?? '').trim()
  return s && /^(https?:\/\/|\/(?!\/))/i.test(s) ? limitString(s, 2000) : null
}
const flt = (v: unknown) => {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET(_: NextRequest, { params }: Params) {
  const auth = await requireRole()
  if (auth.response) return auth.response
  const item = await prisma.cityPage.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireRole()
  if (auth.response) return auth.response
  const existing = await prisma.cityPage.findUnique({ where: { id: params.id }, select: { id: true, slug: true } })
  if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const b = await request.json().catch(() => ({})) as Record<string, unknown>
  const data: Record<string, unknown> = {}

  if (b.name !== undefined) {
    const name = txt(b.name, 120)
    if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
    data.name = name
  }
  if (b.slug !== undefined) {
    const slug = slugify(String(b.slug ?? ''))
    if (!slug) return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
    if (slug !== existing.slug) {
      const dup = await prisma.cityPage.findUnique({ where: { slug }, select: { id: true } })
      if (dup) return NextResponse.json({ error: 'Já existe uma cidade com este slug' }, { status: 409 })
    }
    data.slug = slug
  }
  for (const k of ['tagline', 'raNumber', 'foundedAt', 'founderGovernor', 'population', 'populationSource', 'areaKm2', 'distanceKm', 'seoTitle'] as const) {
    if (b[k] !== undefined) data[k] = txt(b[k], 300)
  }
  if (b.summary !== undefined) data.summary = txt(b.summary, 3000)
  if (b.seoDescription !== undefined) data.seoDescription = txt(b.seoDescription, 400)
  if (b.coverUrl !== undefined) data.coverUrl = url(b.coverUrl)
  if (b.ogImageUrl !== undefined) data.ogImageUrl = url(b.ogImageUrl)
  if (b.videoUrl !== undefined) data.videoUrl = url(b.videoUrl)
  if (b.status !== undefined) data.status = b.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
  if (b.order !== undefined) data.order = Math.max(0, Math.round(Number(b.order) || 0))
  if (b.latitude !== undefined) data.latitude = flt(b.latitude)
  if (b.longitude !== undefined) data.longitude = flt(b.longitude)
  if (b.matchNames !== undefined) {
    data.matchNames = (Array.isArray(b.matchNames) ? b.matchNames : []).map(v => limitString(stripHtml(String(v ?? '')), 80).trim()).filter(Boolean).slice(0, 30)
  }
  if (b.areaInsightId !== undefined) data.areaInsightId = typeof b.areaInsightId === 'string' && b.areaInsightId ? b.areaInsightId : null
  if (b.sections !== undefined) data.sections = sanitizeSections(b.sections) as unknown as object[]

  const item = await prisma.cityPage.update({ where: { id: params.id }, data })
  revalidateSite('config')
  return NextResponse.json(item)
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const auth = await requireRole()
  if (auth.response) return auth.response
  const existing = await prisma.cityPage.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  await prisma.cityPage.delete({ where: { id: params.id } })
  revalidateSite('config')
  return NextResponse.json({ ok: true })
}
