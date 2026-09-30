/**
 * v1.4 — Entrada HTTP do conector do Claude (MCP, transporte Streamable HTTP sem sessão).
 * Duas formas de autenticar, as duas com o mesmo token gerado no painel (Inteligência → Conector):
 *   - /api/mcp/<token>            → para colar como endereço do conector no Claude;
 *   - /api/mcp + Authorization: Bearer <token> → para clientes que mandam cabeçalho.
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { authenticateToken } from './auth'
import { handleBody } from './server'
import { TOOLS } from './tools'

const HEADERS = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }

function ipOf(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'desconhecido'
}

export async function mcpPost(req: NextRequest, token: string | null): Promise<NextResponse> {
  // freio contra tentativa de adivinhar token
  if (!checkRateLimit(`mcp-ip:${ipOf(req)}`, 300, 60_000)) return NextResponse.json({ error: 'Muitas requisições. Aguarde um minuto.' }, { status: 429, headers: HEADERS })
  const user = await authenticateToken(token)
  if (!user) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Token do conector ausente, inválido ou revogado. Gere um novo em Painel → Inteligência → Conector.' } },
      { status: 401, headers: { ...HEADERS, 'WWW-Authenticate': 'Bearer realm="corretorpaulopop-mcp"' } },
    )
  }
  if (!checkRateLimit(`mcp-token:${user.tokenId}`, 120, 60_000)) return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32002, message: 'Muitas chamadas em um minuto. Aguarde e continue.' } }, { status: 429, headers: HEADERS })

  const raw = await req.text()
  if (raw.length > 600_000) return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Mensagem grande demais' } }, { status: 413, headers: HEADERS })
  let body: unknown
  try { body = JSON.parse(raw) } catch {
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }, { status: 400, headers: HEADERS })
  }
  const out = await handleBody(body, TOOLS, { user })
  if (out === null) return new NextResponse(null, { status: 202, headers: HEADERS })
  return NextResponse.json(out, { status: 200, headers: HEADERS })
}

/** GET/DELETE: este servidor não abre fluxo SSE nem guarda sessão. */
export function mcpNotAllowed(): NextResponse {
  return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Use POST (JSON-RPC). Este conector não usa fluxo SSE nem sessão.' } }, { status: 405, headers: { ...HEADERS, Allow: 'POST' } })
}
