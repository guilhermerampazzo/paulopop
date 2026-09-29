export const dynamic = 'force-dynamic'

/**
 * v1.3 — POST /api/admin/blog/ia
 * Corpo: { topic: string, category?: string, city?: string }
 * Gemini devolve { title, excerpt, contentHtml, tags, seoTitle, seoDescription, warning } em pt-BR.
 * Sem GEMINI_API_KEY → 503.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/authz'
import { AiUnavailableError, aiAvailable, generateBlogDraft } from '@/lib/ai-blog'

export async function POST(request: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  if (!aiAvailable()) return NextResponse.json({ error: 'Geração com IA indisponível: configure GEMINI_API_KEY.' }, { status: 503 })

  const body = await request.json().catch(() => ({})) as { topic?: unknown; category?: unknown; city?: unknown }
  const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
  if (!topic) return NextResponse.json({ error: 'Informe o tema do post' }, { status: 400 })

  try {
    const out = await generateBlogDraft({
      topic,
      category: typeof body.category === 'string' ? body.category : undefined,
      city: typeof body.city === 'string' ? body.city : undefined,
    })
    return NextResponse.json(out)
  } catch (e) {
    if (e instanceof AiUnavailableError) return NextResponse.json({ error: e.message }, { status: 503 })
    const message = e instanceof Error ? e.message : 'Falha ao gerar o post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
