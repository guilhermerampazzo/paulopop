export const dynamic = 'force-dynamic'

/**
 * v1.3 — /api/admin/cidades
 * GET: lista as páginas de cidade (painel). POST { name }: cria com slug único e o modelo `cityTemplate`.
 * Acesso: ADMIN / SUPER_ADMIN.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/authz'
import { revalidateSite } from '@/lib/cache'
import { slugify } from '@/lib/utils'
import { cityTemplate } from '@/lib/sections'
import { limitString, stripHtml } from '@/lib/sanitize'

export async function GET() {
  const auth = await requireRole()
  if (auth.response) return auth.response
  const items = await prisma.cityPage.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: { id: true, slug: true, name: true, tagline: true, status: true, order: true, coverUrl: true, matchNames: true, updatedAt: true },
  })
  return NextResponse.json(items)
}

export async function POST(request: NextRequest) {
  const auth = await requireRole()
  if (auth.response) return auth.response
  const body = await request.json().catch(() => ({})) as { name?: string }
  const name = limitString(stripHtml(String(body.name ?? '')), 120).trim()
  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const base = slugify(name) || 'cidade'
  let slug = base
  let n = 1
  while (await prisma.cityPage.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${n++}`

  const last = await prisma.cityPage.aggregate({ _max: { order: true } })
  const item = await prisma.cityPage.create({
    data: { name, slug, status: 'DRAFT', order: (last._max.order ?? 0) + 1, matchNames: [name], sections: cityTemplate(name) as object[] },
  })
  revalidateSite('config')
  return NextResponse.json(item, { status: 201 })
}
