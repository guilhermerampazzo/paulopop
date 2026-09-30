export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, isAdmin } from '@/lib/authz'

/** GET — histórico das buscas de amostras (pelo conector do Claude e pelo painel). */
export async function GET() {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const runs = await prisma.studySearchRun.findMany({
    where: isAdmin(auth.user) ? {} : { study: { agentId: auth.user.id } },
    orderBy: { createdAt: 'desc' }, take: 150,
    include: { study: { select: { id: true, title: true } } },
  })
  return NextResponse.json({ runs })
}
