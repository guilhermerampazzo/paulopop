export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, isAdmin } from '@/lib/authz'
import bcrypt from 'bcryptjs'

// PUT /api/admin/corretores/[id]
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const self = auth.user.id === params.id
  // Corretor comum só edita o próprio perfil; papel e ativo só por administrador
  if (!self && !isAdmin(auth.user)) return NextResponse.json({ error: 'Sem permissão para esta ação' }, { status: 403 })

  const body = await request.json() as Record<string, string | boolean>
  if (!isAdmin(auth.user)) {
    delete body.role
    delete body.active
    delete body.email
  }
  if (body.role === 'SUPER_ADMIN' && auth.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Só o super administrador pode dar esse papel' }, { status: 403 })
  }
  if (body.password && (body.password as string).length < 8) {
    return NextResponse.json({ error: 'A senha precisa ter pelo menos 8 caracteres' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}

  if (body.name) data.name = body.name
  if (body.email) data.email = body.email
  if (body.password) data.password = await bcrypt.hash(body.password as string, 12)
  if (body.role !== undefined) data.role = body.role
  if (body.active !== undefined) data.active = body.active
  if (body.phone !== undefined) data.phone = body.phone
  if (body.whatsapp !== undefined) data.whatsapp = body.whatsapp
  if (body.creci !== undefined) data.creci = body.creci
  if (body.company !== undefined) data.company = body.company
  if (body.companyCreci !== undefined) data.companyCreci = body.companyCreci
  // v1.4: hub do corretor
  if (body.publicName !== undefined) data.publicName = body.publicName || null
  if (body.companyRole !== undefined) data.companyRole = body.companyRole || null
  if (body.bio !== undefined) data.bio = body.bio
  if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl
  if (body.instagram !== undefined) data.instagram = body.instagram
  if (body.facebook !== undefined) data.facebook = body.facebook
  if (body.linkedin !== undefined) data.linkedin = body.linkedin
  if (body.youtube !== undefined) data.youtube = body.youtube
  if (body.telegram !== undefined) data.telegram = body.telegram
  if (body.twitter !== undefined) data.twitter = body.twitter

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true },
  })

  return NextResponse.json(updated)
}

// DELETE /api/admin/corretores/[id] — desativa (soft delete)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  if (!isAdmin(auth.user)) return NextResponse.json({ error: 'Sem permissão para esta ação' }, { status: 403 })
  if (auth.user.id === params.id) return NextResponse.json({ error: 'Você não pode desativar o próprio usuário' }, { status: 400 })

  await prisma.user.update({
    where: { id: params.id },
    data: { active: false },
  })

  return NextResponse.json({ success: true })
}
