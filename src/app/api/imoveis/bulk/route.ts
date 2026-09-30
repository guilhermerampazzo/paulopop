export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidateSite } from '@/lib/cache'
import { requireSession, propertyScope } from '@/lib/authz'

// POST /api/imoveis/bulk
// Body: { action: 'delete' | 'status', ids: string[], status?: string }
export async function POST(request: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  // Corretor comum só age sobre os próprios imóveis
  const scope = propertyScope(auth.user)

  const body = await request.json()
  const { action, ids, status } = body as {
    action: 'delete' | 'status'
    ids: string[]
    status?: string
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Nenhum imóvel selecionado' }, { status: 400 })
  }

  if (action === 'delete') {
    await prisma.property.deleteMany({ where: { id: { in: ids }, ...scope } })
    revalidateSite('properties')
    return NextResponse.json({ success: true, count: ids.length })
  }

  if (action === 'status') {
    if (!status) return NextResponse.json({ error: 'Status não informado' }, { status: 400 })
    // v1.4: anúncios importados de portais de terceiros sem confirmação de autorização não são publicados em lote
    const blocked = ['ACTIVE', 'SOLD', 'RENTED'].includes(String(status))
      ? { NOT: { AND: [{ sourcePortal: { not: null } }, { sourcePortal: { not: 'remax' } }, { publishAuthConfirmedAt: null }] } }
      : {}
    const result = await prisma.property.updateMany({
      where: { id: { in: ids }, ...scope, ...blocked },
      data: {
        status: status as never,
        ...(status === 'ACTIVE' ? { publishedAt: new Date() } : {}),
      },
    })
    revalidateSite('properties')
    return NextResponse.json({ success: true, count: result.count, skipped: ids.length - result.count })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
