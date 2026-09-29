import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'
import { prisma } from './prisma'

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'AGENT'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
}

export const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN']

/** Lê a sessão e devolve o usuário logado (com papel) ou null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  const u = session?.user as (SessionUser & { email?: string | null }) | undefined
  if (!u?.email) return null
  // Confirma no banco: usuário precisa existir e estar ativo (o token pode ser antigo)
  const db = await prisma.user.findUnique({
    where: { email: u.email },
    select: { id: true, email: true, name: true, role: true, active: true },
  })
  if (!db || !db.active) return null
  return { id: db.id, email: db.email, name: db.name, role: db.role as Role }
}

export function isAdmin(user: SessionUser | null | undefined): boolean {
  return !!user && ADMIN_ROLES.includes(user.role)
}

/**
 * Exige login. Devolve { user } ou { response } com 401.
 * Uso: const auth = await requireSession(); if (auth.response) return auth.response
 */
export async function requireSession(): Promise<{ user: SessionUser; response?: undefined } | { user?: undefined; response: NextResponse }> {
  const user = await getSessionUser()
  if (!user) return { response: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  return { user }
}

/** Exige um dos papéis informados (padrão: administradores). 401 sem login, 403 sem permissão. */
export async function requireRole(roles: Role[] = ADMIN_ROLES) {
  const auth = await requireSession()
  if (auth.response) return auth
  if (!roles.includes(auth.user.role)) {
    return { response: NextResponse.json({ error: 'Sem permissão para esta ação' }, { status: 403 }) }
  }
  return auth
}

/**
 * Um corretor (AGENT) só pode mexer nos próprios imóveis; administradores em todos.
 */
export function canManageProperty(user: SessionUser, property: { agentId: string; secondaryAgentId?: string | null }): boolean {
  if (isAdmin(user)) return true
  return property.agentId === user.id || property.secondaryAgentId === user.id
}

/** Filtro Prisma para listar só o que o usuário pode ver no painel. */
export function propertyScope(user: SessionUser): Record<string, unknown> {
  if (isAdmin(user)) return {}
  return { OR: [{ agentId: user.id }, { secondaryAgentId: user.id }] }
}
