export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest } from 'next/server'
import { mcpPost, mcpNotAllowed } from '@/lib/mcp/http'
import { bearerFrom } from '@/lib/mcp/auth'

/** v1.4 — conector do Claude com o token no cabeçalho: Authorization: Bearer <token> */
export async function POST(req: NextRequest) {
  return mcpPost(req, bearerFrom(req.headers.get('authorization')))
}
export const GET = () => mcpNotAllowed()
export const DELETE = () => mcpNotAllowed()
