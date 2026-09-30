export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole } from '@/lib/authz'

/** GET — banco de amostras: todo anúncio já lido para um estudo, reaproveitado nos próximos. */
export async function GET(req: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const sp = req.nextUrl.searchParams
  const q = (sp.get('q') ?? '').trim()
  const portal = sp.get('portal') || undefined
  const page = Math.max(1, Number(sp.get('page')) || 1)
  const where = {
    portal,
    ...(q ? { OR: [{ quadra: { contains: q, mode: 'insensitive' as const } }, { location: { contains: q, mode: 'insensitive' as const } }, { title: { contains: q, mode: 'insensitive' as const } }, { url: { contains: q, mode: 'insensitive' as const } }] } : {}),
  }
  const [total, items, portals] = await Promise.all([
    prisma.sampleBankItem.count({ where }),
    prisma.sampleBankItem.findMany({ where, orderBy: { lastSeenAt: 'desc' }, skip: (page - 1) * 50, take: 50, include: { _count: { select: { samples: true } } } }),
    prisma.sampleBankItem.groupBy({ by: ['portal'], _count: { _all: true } }),
  ])
  return NextResponse.json({ total, page, pages: Math.max(1, Math.ceil(total / 50)), items, portals: portals.map(p => ({ portal: p.portal ?? 'Outro', count: p._count._all })) })
}

/** DELETE ?id= — tira um anúncio do banco (administrador). As amostras dos estudos continuam como estão. */
export async function DELETE(req: NextRequest) {
  const auth = await requireRole()
  if (auth.response) return auth.response
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Anúncio não informado.' }, { status: 400 })
  await prisma.sampleBankItem.deleteMany({ where: { id } })
  return NextResponse.json({ ok: true })
}
