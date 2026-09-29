export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidateSite } from '@/lib/cache'
import { importRemaxListing } from '@/lib/remax/import'
import { RemaxFetchError } from '@/lib/remax/client'

const bodySchema = z.object({
  url: z.string().max(500).optional(),
  payload: z.object({
    listing: z.record(z.string(), z.unknown()),
    labels: z.object({
      lookups: z.record(z.string(), z.string()).optional(),
      translations: z.record(z.string(), z.string()).optional(),
    }).optional(),
    agent: z.object({
      agentName: z.string().max(200).nullable().optional(),
      officeName: z.string().max(200).nullable().optional(),
    }).optional(),
  }).optional(),
  publish: z.boolean().default(true),
}).refine(b => b.url || b.payload, { message: 'Informe o link do anúncio.' })

/** POST — importa (ou atualiza) um anúncio da RE/MAX e publica no site. */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, active: true } })
  if (!user || !user.active) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const raw = await request.text()
  if (raw.length > 2_000_000) return NextResponse.json({ error: 'Dados grandes demais.' }, { status: 413 })

  let parsed
  try {
    parsed = bodySchema.safeParse(JSON.parse(raw))
  } catch {
    return NextResponse.json({ error: 'Dados inválidos. Copie de novo pelo botão da RE/MAX.' }, { status: 400 })
  }
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 })
  }

  try {
    const result = await importRemaxListing({
      url: parsed.data.url,
      payload: parsed.data.payload as Parameters<typeof importRemaxListing>[0]['payload'],
      agentId: user.id,
      publish: parsed.data.publish,
    })
    revalidateSite('properties')
    return NextResponse.json(result, { status: result.created ? 201 : 200 })
  } catch (e) {
    if (e instanceof RemaxFetchError) {
      return NextResponse.json({ error: e.message, blocked: e.blocked }, { status: 502 })
    }
    const message = e instanceof Error ? e.message : 'Erro ao importar.'
    console.error('[importar-remax]', e)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
