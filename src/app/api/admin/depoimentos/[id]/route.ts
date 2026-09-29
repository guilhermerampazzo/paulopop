export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidateSite } from '@/lib/cache'

// PUT /api/admin/depoimentos/[id]
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json() as Record<string, unknown>
  const data: Record<string, unknown> = {}

  if (body.name !== undefined) data.name = body.name
  if (body.role !== undefined) data.role = body.role
  if (body.text !== undefined) data.text = body.text
  if (body.rating !== undefined) data.rating = Number(body.rating)
  if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl
  if (body.source !== undefined) data.source = body.source
  if (body.approved !== undefined) data.approved = Boolean(body.approved)

  const updated = await prisma.testimonial.update({ where: { id: params.id }, data })
  revalidateSite('config')
  return NextResponse.json(updated)
}

// DELETE /api/admin/depoimentos/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.testimonial.delete({ where: { id: params.id } })
  revalidateSite('config')
  return NextResponse.json({ success: true })
}
