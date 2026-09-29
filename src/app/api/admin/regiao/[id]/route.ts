export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/authz'
import { revalidateSite } from '@/lib/cache'
import { stripHtml, limitString } from '@/lib/sanitize'
import { CATEGORIES, type AreaManual } from '@/lib/area-insight'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const insight = await prisma.areaInsight.findUnique({ where: { id: params.id } })
  if (!insight) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ insight })
}

/** Salva os ajustes manuais do corretor (destaques, lugares ocultos, lugares extras, resumo). */
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const body = await req.json().catch(() => ({})) as { manual?: AreaManual }
  const m = body.manual ?? {}
  const keys = new Set(CATEGORIES.map(c => c.key))
  const manual: AreaManual = {
    highlights: (Array.isArray(m.highlights) ? m.highlights : []).map(h => ({ text: limitString(stripHtml(String(h?.text ?? '')), 160) })).filter(h => h.text).slice(0, 12),
    hidden: (Array.isArray(m.hidden) ? m.hidden : []).map(String).slice(0, 200),
    extraPlaces: (Array.isArray(m.extraPlaces) ? m.extraPlaces : []).filter(e => e && keys.has(String(e.category))).map(e => ({ category: String(e.category), name: limitString(stripHtml(String(e.name ?? '')), 120), address: e.address ? limitString(stripHtml(String(e.address)), 200) : undefined, distanceM: Number.isFinite(Number(e.distanceM)) ? Math.max(0, Math.round(Number(e.distanceM))) : undefined })).filter(e => e.name).slice(0, 40),
    summary: m.summary ? limitString(stripHtml(String(m.summary)), 600) : undefined,
  }
  const insight = await prisma.areaInsight.update({ where: { id: params.id }, data: { manual: manual as object } }).catch(() => null)
  if (!insight) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  revalidateSite('properties', 'empreendimentos', 'config')
  return NextResponse.json({ insight })
}
