/**
 * v1.4 — Token do conector do Claude (MCP).
 * O token é mostrado uma única vez ao corretor; o banco guarda só o hash (sha256) e o começo (para identificar).
 * Pode ser revogado no painel a qualquer momento. Sem token válido, o conector responde 401.
 */
import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/lib/authz'

export const TOKEN_PREFIX = 'ppk_'

export function generateToken(): { token: string; hash: string; prefix: string } {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`
  return { token, hash: hashToken(token), prefix: token.slice(0, 10) }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export const looksLikeToken = (t: string | null | undefined): t is string => typeof t === 'string' && /^ppk_[A-Za-z0-9_-]{40,50}$/.test(t)

export interface McpUser { id: string; name: string; role: Role; tokenId: string }

/** Confere o token e devolve o corretor dono dele (ativo). Atualiza "último uso" no máximo uma vez por minuto. */
export async function authenticateToken(raw: string | null | undefined): Promise<McpUser | null> {
  if (!looksLikeToken(raw)) return null
  const row = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(raw) }, select: { id: true, revokedAt: true, lastUsedAt: true, user: { select: { id: true, name: true, role: true, active: true } } } })
  if (!row || row.revokedAt || !row.user.active) return null
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000) {
    await prisma.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => { /* não bloqueia o uso */ })
  }
  return { id: row.user.id, name: row.user.name, role: row.user.role as Role, tokenId: row.id }
}

export function bearerFrom(header: string | null | undefined): string | null {
  const m = String(header ?? '').match(/^Bearer\s+(\S+)$/i)
  return m ? m[1] : null
}
