export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidateSite } from '@/lib/cache'

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const admin = searchParams.get('admin') === 'true'
  const q = searchParams.get('q')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '12')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (!admin) where.status = 'PUBLISHED'
  if (q) where.name = { contains: q, mode: 'insensitive' }

  const [empreendimentos, total] = await Promise.all([
    prisma.empreendimento.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        images: { where: { category: 'FACHADA' }, take: 1, orderBy: { order: 'asc' } },
      },
    }),
    prisma.empreendimento.count({ where }),
  ])

  return NextResponse.json({ empreendimentos, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { name } = body
  if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const baseSlug = slugify(name)
  let slug = baseSlug
  let counter = 1
  while (await prisma.empreendimento.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`
  }

  const empreendimento = await prisma.empreendimento.create({
    data: { name: name.trim(), slug },
  })

  revalidateSite('empreendimentos')
  return NextResponse.json(empreendimento, { status: 201 })
}
