export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/authz'
import { stripHtml, limitString } from '@/lib/sanitize'

/** v1.1 — Meu perfil: o corretor logado lê e edita os próprios dados (nome, CRECI, foto, contatos, redes). */
const SELECT = {
  id: true, name: true, email: true, role: true, phone: true, whatsapp: true, creci: true, bio: true, avatarUrl: true,
  company: true, companyCreci: true, instagram: true, facebook: true, linkedin: true, youtube: true, telegram: true, twitter: true,
} as const

export async function GET() {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const me = await prisma.user.findUnique({ where: { id: auth.user.id }, select: SELECT })
  return NextResponse.json(me)
}

export async function PUT(request: NextRequest) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const body = await request.json() as Record<string, unknown>
  const safe = (v: unknown, max = 200) => (typeof v === 'string' ? limitString(stripHtml(v), max) : undefined)

  const data: Record<string, unknown> = {
    name: safe(body.name, 150) || undefined,
    phone: safe(body.phone, 30),
    whatsapp: safe(body.whatsapp, 30),
    creci: safe(body.creci, 50),
    bio: safe(body.bio, 2000),
    avatarUrl: safe(body.avatarUrl, 500),
    company: safe(body.company, 200),
    companyCreci: safe(body.companyCreci, 50),
    instagram: safe(body.instagram, 300),
    facebook: safe(body.facebook, 300),
    linkedin: safe(body.linkedin, 300),
    youtube: safe(body.youtube, 300),
    telegram: safe(body.telegram, 300),
    twitter: safe(body.twitter, 300),
  }
  if (typeof body.newPassword === 'string' && body.newPassword) {
    if (body.newPassword.length < 8) return NextResponse.json({ error: 'A nova senha precisa ter pelo menos 8 caracteres' }, { status: 400 })
    const me = await prisma.user.findUnique({ where: { id: auth.user.id }, select: { password: true } })
    const ok = me && typeof body.currentPassword === 'string' && (await bcrypt.compare(body.currentPassword, me.password))
    if (!ok) return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
    data.password = await bcrypt.hash(body.newPassword, 12)
  }
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  const updated = await prisma.user.update({ where: { id: auth.user.id }, data: clean, select: SELECT })
  return NextResponse.json(updated)
}
