export const dynamic = 'force-dynamic'

/**
 * v1.3 — /api/admin/parceiros
 * GET: lista os parceiros (painel). POST { name, type }: cria com slug único e o modelo `partnerTemplate`.
 * Acesso: ADMIN / SUPER_ADMIN.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/authz'
import { revalidateSite } from '@/lib/cache'
import { slugify } from '@/lib/utils'
import { partnerTemplate } from '@/lib/sections'
import { limitString, stripHtml } from '@/lib/sanitize'
import { PARTNER_TYPES } from '@/lib/partners'

export async function GET() {
  const auth = await requireRole()
  if (auth.response) return auth.response
  const items = await prisma.partner.findMany({
    orderBy: [{ featured: 'desc' }, { order: 'asc' }, { name: 'asc' }],
    select: { id: true, slug: true, name: true, type: true, tagline: true, status: true, order: true, featured: true, logoUrl: true, updatedAt: true },
  })
  return NextResponse.json(items)
}

export async function POST(request: NextRequest) {
  const auth = await requireRole()
  if (auth.response) return auth.response
  const body = await request.json().catch(() => ({})) as { name?: string; type?: string }
  const name = limitString(stripHtml(String(body.name ?? '')), 120).trim()
  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  const type = PARTNER_TYPES.find(t => t === body.type) ?? 'OUTRO'

  const base = slugify(name) || 'parceiro'
  let slug = base
  let n = 1
  while (await prisma.partner.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${n++}`

  const last = await prisma.partner.aggregate({ _max: { order: true } })
  const item = await prisma.partner.create({
    data: { name, slug, type, status: 'DRAFT', order: (last._max.order ?? 0) + 1, sections: partnerTemplate(name) as object[] },
  })
  revalidateSite('config')
  return NextResponse.json(item, { status: 201 })
}
