export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/authz'
import bcrypt from 'bcryptjs'

// GET /api/admin/corretores — lista todos os corretores
export async function GET() {
  const auth = await requireRole()
  if (auth.response) return auth.response

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      whatsapp: true,
      creci: true,
      company: true,
      publicName: true,
      companyRole: true,
      avatarUrl: true,
      active: true,
      createdAt: true,
      _count: { select: { properties: true } },
    },
  })

  return NextResponse.json(users)
}

// POST /api/admin/corretores — cria novo corretor
export async function POST(request: NextRequest) {
  const auth = await requireRole()
  if (auth.response) return auth.response

  const body = await request.json() as {
    name: string
    email: string
    password: string
    role?: string
    phone?: string
    whatsapp?: string
    creci?: string
    company?: string
    companyCreci?: string
    publicName?: string
    companyRole?: string
    bio?: string
    instagram?: string
    facebook?: string
    linkedin?: string
    youtube?: string
  }

  if (!body.name || !body.email || !body.password) {
    return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios' }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({ where: { email: body.email } })
  if (exists) {
    return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })
  }

  if (body.password.length < 8) {
    return NextResponse.json({ error: 'A senha precisa ter pelo menos 8 caracteres' }, { status: 400 })
  }
  // Só o super administrador cria outro super administrador
  const role = body.role === 'SUPER_ADMIN' && auth.user.role !== 'SUPER_ADMIN' ? 'ADMIN' : (body.role ?? 'AGENT')
  const hashed = await bcrypt.hash(body.password, 12)

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: hashed,
      role: role as 'SUPER_ADMIN' | 'ADMIN' | 'AGENT',
      phone: body.phone,
      whatsapp: body.whatsapp,
      creci: body.creci,
      company: body.company,
      companyCreci: body.companyCreci,
      publicName: body.publicName || null,
      companyRole: body.companyRole || null,
      bio: body.bio,
      instagram: body.instagram,
      facebook: body.facebook,
      linkedin: body.linkedin,
      youtube: body.youtube,
    },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json(user, { status: 201 })
}
