export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidateSite } from '@/lib/cache'

// GET /api/admin/depoimentos
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const items = await prisma.testimonial.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(items)
}

// POST /api/admin/depoimentos — criar depoimento (admin)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json() as {
    name: string
    role?: string
    text: string
    rating?: number
    avatarUrl?: string
    source?: string
    approved?: boolean
  }

  if (!body.name || !body.text) {
    return NextResponse.json({ error: 'Nome e texto são obrigatórios' }, { status: 400 })
  }

  const item = await prisma.testimonial.create({
    data: {
      name: body.name,
      role: body.role,
      text: body.text,
      rating: body.rating ?? 5,
      avatarUrl: body.avatarUrl,
      source: body.source ?? 'manual',
      approved: body.approved ?? true,
    },
  })

  revalidateSite('config')
  return NextResponse.json(item, { status: 201 })
}
