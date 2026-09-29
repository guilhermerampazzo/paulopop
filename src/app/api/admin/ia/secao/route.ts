export const dynamic = 'force-dynamic'

/**
 * v1.3 — POST /api/admin/ia/secao
 * Corpo: { type: 'text' | 'faq' | 'items', title?: string, context?: string }
 * Gera conteúdo em pt-BR com Gemini para uma seção do editor. Sem chave → 503.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/authz'
import { AiUnavailableError, aiAvailable, generateSectionContent, type SectionAiType } from '@/lib/ai-sections'

const TYPES: SectionAiType[] = ['text', 'faq', 'items']

export async function POST(request: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  if (!aiAvailable()) return NextResponse.json({ error: 'Geração com IA indisponível: configure GEMINI_API_KEY.' }, { status: 503 })

  const body = await request.json().catch(() => ({})) as { type?: string; title?: string; context?: string }
  const type = TYPES.find(t => t === body.type)
  if (!type) return NextResponse.json({ error: 'Tipo inválido (use text, faq ou items)' }, { status: 400 })

  try {
    const out = await generateSectionContent({ type, title: typeof body.title === 'string' ? body.title : undefined, context: typeof body.context === 'string' ? body.context : undefined })
    return NextResponse.json(out)
  } catch (e) {
    if (e instanceof AiUnavailableError) return NextResponse.json({ error: e.message }, { status: 503 })
    const message = e instanceof Error ? e.message : 'Falha ao gerar conteúdo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
