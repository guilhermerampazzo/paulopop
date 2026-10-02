export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ogImageResponse } from '@/lib/og-image'

/**
 * v1.5 — Imagem de compartilhamento do empreendimento (1200×630).
 * Ordem: capa → primeira foto da fachada → primeira foto das áreas comuns → qualquer foto.
 * Só empreendimentos publicados. Sem foto → imagem padrão do site.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const emp = await prisma.empreendimento.findFirst({
    where: { id: params.id, status: 'PUBLISHED' },
    select: { coverUrl: true, images: { orderBy: { order: 'asc' }, select: { url: true, category: true } } },
  })
  const pick = (cat: string) => emp?.images.find(i => i.category === cat)?.url
  const url = emp?.coverUrl || pick('FACHADA') || pick('AREAS_COMUNS') || emp?.images[0]?.url
  return ogImageResponse(req, url)
}
