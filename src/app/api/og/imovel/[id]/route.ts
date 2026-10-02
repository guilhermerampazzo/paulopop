export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ogImageResponse } from '@/lib/og-image'

/**
 * v1.4 — Foto principal do imóvel pronta para compartilhar (1200×630; ?modo=foto = inteira).
 * Só imóveis publicados. Sem foto → imagem padrão do site.
 * v1.5: a montagem da imagem foi para src/lib/og-image.ts (usada também pelos empreendimentos).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const property = await prisma.property.findFirst({
    where: { id: params.id, status: { in: ['ACTIVE', 'SOLD', 'RENTED'] }, hideOnSite: false },
    select: { images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 1, select: { url: true } } },
  })
  return ogImageResponse(req, property?.images[0]?.url)
}
