export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { requireSession, isAdmin } from '@/lib/authz'
import { SITE_URL } from '@/lib/site'

/** POST: conclui o estudo e gera (ou renova) o link público com validade. DELETE: remove o link. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const study = await prisma.marketStudy.findUnique({ where: { id: params.id }, select: { id: true, agentId: true, publicToken: true } })
  if (!study) return NextResponse.json({ error: 'Estudo não encontrado' }, { status: 404 })
  if (!isAdmin(auth.user) && study.agentId !== auth.user.id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  const body = await req.json().catch(() => ({})) as { days?: number; renew?: boolean }
  const days = Math.min(365, Math.max(1, Number(body.days) || 60))
  const token = !study.publicToken || body.renew ? randomBytes(12).toString('base64url') : study.publicToken
  const updated = await prisma.marketStudy.update({
    where: { id: study.id },
    data: { status: 'DONE', publicToken: token, tokenExpiresAt: new Date(Date.now() + days * 86_400_000) },
    select: { publicToken: true, tokenExpiresAt: true, status: true },
  })
  return NextResponse.json({ ...updated, url: `${SITE_URL}/estudo/${updated.publicToken}` })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const study = await prisma.marketStudy.findUnique({ where: { id: params.id }, select: { id: true, agentId: true } })
  if (!study) return NextResponse.json({ error: 'Estudo não encontrado' }, { status: 404 })
  if (!isAdmin(auth.user) && study.agentId !== auth.user.id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  await prisma.marketStudy.update({ where: { id: study.id }, data: { publicToken: null, tokenExpiresAt: null, status: 'DRAFT' } })
  return NextResponse.json({ ok: true })
}
