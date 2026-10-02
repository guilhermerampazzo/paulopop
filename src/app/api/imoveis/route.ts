export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidateSite } from '@/lib/cache'
import { generateRef } from '@/lib/utils'
import { buildPropertySlug, uniqueSlug } from '@/lib/property-slug'
import { getSessionUser, propertyScope } from '@/lib/authz'
import { toPublicProperty } from '@/lib/property-public'
import { searchTextWhere } from '@/lib/property-search'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  // Teto de 50 por página para evitar despejo da base inteira
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '12') || 12))
  const status = searchParams.get('status')
  const transactionType = searchParams.get('transactionType')
  const purpose = searchParams.get('purpose')
  const city = searchParams.get('city')
  // v1.3: busca por texto único (ref, título, bairro, cidade, endereço, bairro comercial, nome do empreendimento)
  const q = (searchParams.get('q') ?? searchParams.get('busca') ?? '').trim().slice(0, 120)
  let admin = searchParams.get('admin') === 'true'

  // admin=true só com login; corretor comum vê apenas os próprios imóveis
  let where: Record<string, unknown> = {}
  if (admin) {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    where = { ...propertyScope(user) }
    if (status) where.status = status
  } else {
    admin = false
    where.status = 'ACTIVE'
    where.hideOnSite = false
  }

  const skip = (page - 1) * limit
  if (transactionType) where.transactionType = transactionType
  if (purpose) where.purpose = purpose
  if (city) where.city = { contains: city, mode: 'insensitive' }
  if (q) where.OR = searchTextWhere(q)

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        // Capa marcada ou, na falta dela, a primeira foto pela ordem
        images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 1 },
        agent: { select: { name: true, phone: true, whatsapp: true } },
      },
    }),
    prisma.property.count({ where }),
  ])

  const list = admin ? properties : properties.map(toPublicProperty)
  const response = NextResponse.json({ properties: list, total, page, limit, pages: Math.ceil(total / limit) })
  if (!admin) {
    // Cache de 5 minutos para listagem pública
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')
  }
  return response
}

export async function POST(request: NextRequest) {
  const auth = await getSessionUser()
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const agent = { id: auth.id }

  const body = await request.json()
  const { propertyType, purpose, transactionType, location } = body
  let { neighborhood, city } = body
  // v1.5: imóvel criado a partir do empreendimento já nasce vinculado (bairro/cidade do prédio entram no slug)
  let empreendimentoId: string | null = null
  if (typeof body.empreendimentoId === 'string' && body.empreendimentoId) {
    const emp = await prisma.empreendimento.findUnique({ where: { id: body.empreendimentoId }, select: { id: true, neighborhood: true, city: true } })
    if (emp) {
      empreendimentoId = emp.id
      if (!(typeof neighborhood === 'string' && neighborhood.trim()) && emp.neighborhood) neighborhood = emp.neighborhood
      if (!(typeof city === 'string' && city.trim()) && emp.city) city = emp.city
    }
  }

  if (!propertyType) return NextResponse.json({ error: 'Tipo de imóvel obrigatório' }, { status: 400 })

  const ref = generateRef()
  // v1.3: slug com bairro/cidade (tipo-transacao-bairro-ref)
  const baseSlug = await uniqueSlug(
    buildPropertySlug({ propertyType, transactionType: transactionType ?? 'SALE', neighborhood: typeof neighborhood === 'string' ? neighborhood : null, city: typeof city === 'string' ? city : null, ref }),
    async s => !!(await prisma.property.findUnique({ where: { slug: s }, select: { id: true } })),
  )

  const property = await prisma.property.create({
    data: {
      ref,
      slug: baseSlug,
      propertyType,
      purpose: purpose ?? 'RESIDENTIAL',
      transactionType: transactionType ?? 'SALE',
      location: location ?? 'BRAZIL',
      ...(typeof neighborhood === 'string' && neighborhood.trim() ? { neighborhood: neighborhood.trim() } : {}),
      ...(typeof city === 'string' && city.trim() ? { city: city.trim() } : {}),
      agentId: agent.id,
      status: 'DRAFT',
      ...(empreendimentoId ? { empreendimentoId } : {}),
    },
  })

  revalidateSite('properties')
  return NextResponse.json(property, { status: 201 })
}
