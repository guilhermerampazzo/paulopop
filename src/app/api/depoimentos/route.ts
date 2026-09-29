export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rateLimit'
import { stripHtml } from '@/lib/sanitize'

// POST /api/depoimentos — envio público de depoimento (aguarda aprovação)
export async function POST(request: NextRequest) {
  // v1.1: limite de 3 depoimentos por IP por hora e sem HTML
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (!checkRateLimit(`depoimentos:${ip}`, 3, 3600_000)) {
    return NextResponse.json({ error: 'Muitos envios. Tente novamente mais tarde.' }, { status: 429 })
  }
  const body = await request.json() as {
    name: string
    role?: string
    text: string
    rating?: number
  }

  if (!body.name || !body.text) {
    return NextResponse.json({ error: 'Nome e texto são obrigatórios' }, { status: 400 })
  }

  if (body.text.length > 1000) {
    return NextResponse.json({ error: 'Texto muito longo (máx 1000 caracteres)' }, { status: 400 })
  }

  await prisma.testimonial.create({
    data: {
      name: stripHtml(String(body.name)).substring(0, 150),
      role: body.role ? stripHtml(String(body.role)).substring(0, 150) : null,
      text: stripHtml(String(body.text)).substring(0, 1000),
      rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
      source: 'site',
      approved: false, // aguarda aprovação do admin
    },
  })

  return NextResponse.json({ success: true })
}

// GET /api/depoimentos — retorna depoimentos aprovados para o frontend
export async function GET() {
  const items = await prisma.testimonial.findMany({
    where: { approved: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, role: true, text: true, rating: true, avatarUrl: true, createdAt: true },
  })
  return NextResponse.json(items)
}
