export const dynamic = 'force-dynamic'

/**
 * v1.3 — /api/admin/parceiros/[id]: GET, PUT (todos os campos, com sanitização) e DELETE.
 * Acesso: ADMIN / SUPER_ADMIN.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/authz'
import { revalidateSite } from '@/lib/cache'
import { slugify } from '@/lib/utils'
import { limitString, stripHtml } from '@/lib/sanitize'
import { sanitizeSections } from '@/lib/sections-sanitize'
import { PARTNER_TYPES } from '@/lib/partners'

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

export async function GET(_: NextRequest, { params }: Params) {
  const auth = await requireRole()
  if (auth.response) return auth.response
  const item = await prisma.partner.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireRole()
  if (auth.response) return auth.response
  const existing = await prisma.partner.findUnique({ where: { id: params.id }, select: { id: true, slug: true } })
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
      const dup = await prisma.partner.findUnique({ where: { slug }, select: { id: true } })
      if (dup) return NextResponse.json({ error: 'Já existe um parceiro com este slug' }, { status: 409 })
    }
    data.slug = slug
  }
  if (b.type !== undefined) data.type = PARTNER_TYPES.find(t => t === b.type) ?? 'OUTRO'
  for (const k of ['tagline', 'phone', 'whatsapp', 'email', 'address', 'instagram', 'seoTitle'] as const) {
    if (b[k] !== undefined) data[k] = txt(b[k], 300)
  }
  if (b.summary !== undefined) data.summary = txt(b.summary, 3000)
  if (b.benefit !== undefined) data.benefit = txt(b.benefit, 1500)
  if (b.seoDescription !== undefined) data.seoDescription = txt(b.seoDescription, 400)
  if (b.website !== undefined) data.website = url(b.website)
  if (b.logoUrl !== undefined) data.logoUrl = url(b.logoUrl)
  if (b.coverUrl !== undefined) data.coverUrl = url(b.coverUrl)
  if (b.mapEmbedUrl !== undefined) {
    const u = url(b.mapEmbedUrl)
    data.mapEmbedUrl = u && /^https:\/\/(www\.)?google\.[a-z.]+\/maps/i.test(u) ? u : null
  }
  if (b.status !== undefined) data.status = b.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
  if (b.order !== undefined) data.order = Math.max(0, Math.round(Number(b.order) || 0))
  if (b.featured !== undefined) data.featured = !!b.featured
  if (b.empreendimentoIds !== undefined) {
    data.empreendimentoIds = (Array.isArray(b.empreendimentoIds) ? b.empreendimentoIds : []).map(v => String(v ?? '').trim()).filter(v => /^[\w-]{1,64}$/.test(v)).slice(0, 60)
  }
  if (b.sections !== undefined) data.sections = sanitizeSections(b.sections) as unknown as object[]

  const item = await prisma.partner.update({ where: { id: params.id }, data })
  revalidateSite('config')
  return NextResponse.json(item)
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const auth = await requireRole()
  if (auth.response) return auth.response
  const existing = await prisma.partner.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  await prisma.partner.delete({ where: { id: params.id } })
  revalidateSite('config')
  return NextResponse.json({ ok: true })
}
