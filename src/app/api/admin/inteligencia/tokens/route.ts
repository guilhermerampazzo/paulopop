export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { readJsonObject } from '@/lib/json-body'
import { prisma } from '@/lib/prisma'
import { requireSession, isAdmin } from '@/lib/authz'
import { generateToken } from '@/lib/mcp/auth'
import { SITE_URL } from '@/lib/site'
import { stripHtml, limitString } from '@/lib/sanitize'

/** GET — tokens do conector do Claude (o valor do token nunca volta; só o começo, para identificar). */
export async function GET() {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const tokens = await prisma.apiToken.findMany({
    where: isAdmin(auth.user) ? {} : { userId: auth.user.id },
    orderBy: { createdAt: 'desc' }, take: 50,
    select: { id: true, name: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true, user: { select: { name: true } } },
  })
  return NextResponse.json({ tokens, baseUrl: `${SITE_URL}/api/mcp` })
}

/** POST — gera um token. O endereço completo do conector aparece UMA vez, nesta resposta. */
export async function POST(req: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const b = await readJsonObject(req) as { name?: string }
  const name = limitString(stripHtml(String(b.name ?? '')).trim(), 60) || 'Claude'
  const active = await prisma.apiToken.count({ where: { userId: auth.user.id, revokedAt: null } })
  if (active >= 5) return NextResponse.json({ error: 'Você já tem 5 tokens ativos. Revogue um antes de gerar outro.' }, { status: 400 })
  const t = generateToken()
  const row = await prisma.apiToken.create({ data: { userId: auth.user.id, name, tokenHash: t.hash, prefix: t.prefix }, select: { id: true, name: true, prefix: true, createdAt: true } })
  return NextResponse.json({ ...row, token: t.token, connectorUrl: `${SITE_URL}/api/mcp/${t.token}` }, { status: 201 })
}

/** DELETE ?id= — revoga o token: o conector para de funcionar na hora. */
export async function DELETE(req: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Token não informado.' }, { status: 400 })
  const row = await prisma.apiToken.findUnique({ where: { id }, select: { userId: true } })
  if (!row || (!isAdmin(auth.user) && row.userId !== auth.user.id)) return NextResponse.json({ error: 'Token não encontrado.' }, { status: 404 })
  await prisma.apiToken.update({ where: { id }, data: { revokedAt: new Date() } })
  return NextResponse.json({ ok: true })
}
