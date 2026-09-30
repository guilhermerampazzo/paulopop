export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, isAdmin } from '@/lib/authz'
import { checkRateLimit } from '@/lib/rateLimit'
import { parseListingText, portalOf } from '@/lib/portal-reader/parse'
import { readListingFromUrl, PortalReadError } from '@/lib/portal-reader/read'
import { createDraftFromListing, sanitizeDraft } from '@/lib/portal-reader/import'

/**
 * v1.4 — Importador de anúncios por link (DF Imóveis, WImóveis, OLX, VivaReal, ZAP, Imovelweb, Chaves na Mão)
 * e por texto colado. Dois passos:
 *   step "ler":   lê o link ou o texto e devolve os campos para o corretor conferir (nada é gravado);
 *   step "criar": cria o imóvel como RASCUNHO. As fotos do anúncio original só são copiadas se o corretor
 *                 marcar que o anúncio é dele ou que tem autorização escrita do proprietário.
 * Os anúncios da RE/MAX continuam no importador próprio (/api/admin/importar-remax).
 */
export async function POST(req: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  if (!checkRateLimit(`importar:${auth.user.id}`, 30, 60_000)) return NextResponse.json({ error: 'Muitas leituras em um minuto. Aguarde um pouco.' }, { status: 429 })
  const raw = await req.text()
  if (raw.length > 400_000) return NextResponse.json({ error: 'Texto grande demais.' }, { status: 413 })
  let body: { step?: string; url?: string; text?: string; draft?: Record<string, unknown>; authConfirmed?: boolean }
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  if (body.step === 'criar') {
    if (!body.draft || typeof body.draft !== 'object') return NextResponse.json({ error: 'Leia o anúncio antes de criar o cadastro.' }, { status: 400 })
    let draft
    try { draft = sanitizeDraft(body.draft) } catch { return NextResponse.json({ error: 'Dados do anúncio inválidos.' }, { status: 400 }) }
    if (draft.url && portalOf(draft.url)?.slug === 'remax') return NextResponse.json({ error: 'Anúncio da RE/MAX: use a aba "RE/MAX", que traz todos os campos.' }, { status: 400 })
    try {
      const result = await createDraftFromListing(draft, { agentId: auth.user.id, authConfirmed: body.authConfirmed === true, via: 'PAINEL', isAdmin: isAdmin(auth.user) })
      return NextResponse.json(result, { status: result.created ? 201 : 200 })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao criar o cadastro.' }, { status: 400 })
    }
  }

  // step "ler"
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  if (text.length >= 20) return NextResponse.json({ draft: parseListingText(text, url || null), source: 'texto' })
  if (!url) return NextResponse.json({ error: 'Cole o link do anúncio ou o texto do anúncio.' }, { status: 400 })
  if (portalOf(url)?.slug === 'remax') return NextResponse.json({ error: 'Anúncio da RE/MAX: use a aba "RE/MAX", que traz todos os campos.' }, { status: 400 })
  try {
    return NextResponse.json({ draft: await readListingFromUrl(url), source: 'link' })
  } catch (e) {
    if (e instanceof PortalReadError) return NextResponse.json({ error: e.message, blocked: e.blocked }, { status: e.status })
    console.error('[importar]', e)
    return NextResponse.json({ error: 'Não foi possível ler o anúncio. Use "Colar texto".' }, { status: 502 })
  }
}
