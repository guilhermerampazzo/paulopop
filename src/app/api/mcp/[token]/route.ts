export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest } from 'next/server'
import { mcpPost, mcpNotAllowed } from '@/lib/mcp/http'

/** v1.4 — conector do Claude com o token no endereço: https://corretorpaulopop.com/api/mcp/<token> */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  return mcpPost(req, params.token)
}
export const GET = () => mcpNotAllowed()
export const DELETE = () => mcpNotAllowed()
