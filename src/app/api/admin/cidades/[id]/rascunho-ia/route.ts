export const dynamic = 'force-dynamic'

/**
 * v1.3 — POST /api/admin/cidades/[id]/rascunho-ia
 * Gera com Gemini um rascunho (história, linha do tempo, nomes, números, locais) no formato de
 * `src/lib/sections.ts` para o painel mesclar nas seções vazias. Não grava nada. Sem chave → 503.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/authz'
import { AiUnavailableError, aiAvailable, generateCityDraft } from '@/lib/ai-sections'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole()
  if (auth.response) return auth.response
  if (!aiAvailable()) return NextResponse.json({ error: 'Geração com IA indisponível: configure GEMINI_API_KEY.' }, { status: 503 })

  const city = await prisma.cityPage.findUnique({ where: { id: params.id }, select: { name: true, raNumber: true, foundedAt: true } })
  if (!city) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  try {
    const draft = await generateCityDraft(city.name, { raNumber: city.raNumber, foundedAt: city.foundedAt })
    return NextResponse.json({
      warning: draft.warning,
      sections: [draft.history, draft.timeline, draft.people, draft.stats, draft.places],
    })
  } catch (e) {
    if (e instanceof AiUnavailableError) return NextResponse.json({ error: e.message }, { status: 503 })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha ao gerar rascunho' }, { status: 500 })
  }
}
