export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { readJsonObject } from '@/lib/json-body'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole } from '@/lib/authz'
import { ensureSeedLoaded } from '@/lib/intel/db'
import { stripHtml, limitString } from '@/lib/sanitize'

/** GET — observações por região (uso interno da pesquisa; não vão a relatório público). */
export async function GET() {
  const auth = await requireSession()
  if (auth.response) return auth.response
  await ensureSeedLoaded()
  return NextResponse.json({ regions: await prisma.intelRegionNote.findMany({ orderBy: [{ city: 'asc' }, { name: 'asc' }] }) })
}

/** PUT — o corretor corrige o que sabe da região (administrador). */
export async function PUT(req: NextRequest) {
  const auth = await requireRole()
  if (auth.response) return auth.response
  const b = await readJsonObject(req) as Record<string, unknown>
  const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? limitString(stripHtml(v).trim(), 3000) || null : null)
  if (typeof b.id !== 'string') return NextResponse.json({ error: 'Região não informada.' }, { status: 400 })
  try {
    return NextResponse.json(await prisma.intelRegionNote.update({ where: { id: b.id }, data: { confirmed: clean(b.confirmed), market: clean(b.market) } }))
  } catch {
    return NextResponse.json({ error: 'Região não encontrada.' }, { status: 404 })
  }
}
