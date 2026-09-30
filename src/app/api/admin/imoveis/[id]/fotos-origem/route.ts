export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { readJsonObject } from '@/lib/json-body'
import { prisma } from '@/lib/prisma'
import { requireSession, canManageProperty } from '@/lib/authz'
import { bringSourcePhotos } from '@/lib/portal-reader/import'

/**
 * v1.4 — copia para o site as fotos do anúncio de origem (importado de portal), depois que o corretor
 * confirma que o anúncio é dele ou que tem autorização escrita do proprietário.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const p = await prisma.property.findUnique({ where: { id: params.id }, select: { id: true, agentId: true, secondaryAgentId: true } })
  if (!p) return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
  if (!canManageProperty(auth.user, p)) return NextResponse.json({ error: 'Sem permissão para este imóvel' }, { status: 403 })
  const body = await readJsonObject(req) as { confirm?: boolean }
  if (body.confirm !== true) return NextResponse.json({ error: 'Confirme que o anúncio é seu ou que você tem autorização escrita do proprietário.' }, { status: 400 })
  const r = await bringSourcePhotos(p.id, auth.user.id)
  return NextResponse.json({ ok: true, ...r })
}
