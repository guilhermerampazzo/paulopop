import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, isAdmin, type SessionUser } from '@/lib/authz'
import { STUDY_SEARCH_SELECT } from '@/lib/intel/site-search'

/** v1.4 — confere login e dono do estudo (administrador vê todos). */
export async function guardStudy(id: string): Promise<{ response: NextResponse; user?: undefined; study?: undefined } | { response?: undefined; user: SessionUser; study: NonNullable<Awaited<ReturnType<typeof load>>> }> {
  const auth = await requireSession()
  if (auth.response) return { response: auth.response }
  const study = await load(id)
  if (!study) return { response: NextResponse.json({ error: 'Estudo não encontrado' }, { status: 404 }) }
  if (!isAdmin(auth.user) && study.agentId !== auth.user.id) return { response: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }) }
  return { user: auth.user, study }
}

function load(id: string) {
  return prisma.marketStudy.findUnique({ where: { id }, select: STUDY_SEARCH_SELECT })
}
