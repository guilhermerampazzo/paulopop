export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidateSite } from '@/lib/cache'
import { stripHtml, limitString } from '@/lib/sanitize'
import { requireRole } from '@/lib/authz'
import { revalidatePath } from 'next/cache'

export async function GET() {
  const auth = await requireRole()
  if (auth.response) return auth.response

  const config = await prisma.siteConfig.findFirst()
  return NextResponse.json(config ?? {})
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole()
  if (auth.response) return auth.response

  const body = await request.json() as Record<string, string | boolean>

  // Sanitizar e limitar todos os campos de texto
  const safe = (v: unknown, max = 500) =>
    typeof v === 'string' ? limitString(stripHtml(v), max) : undefined

  const data = {
    ownerName: safe(body.ownerName, 150),
    ownerCreci: safe(body.ownerCreci, 50),
    ownerBio: safe(body.ownerBio, 2000),
    ownerCompany: safe(body.ownerCompany, 200),
    ownerCompanyCreci: safe(body.ownerCompanyCreci, 50),
    ownerPhotoUrl: safe(body.ownerPhotoUrl, 500),
    ownerPhone: safe(body.ownerPhone, 30),
    ownerWhatsapp: safe(body.ownerWhatsapp, 30),
    ownerEmail: safe(body.ownerEmail, 200),
    ownerAddress: safe(body.ownerAddress, 300),
    ownerInstagram: safe(body.ownerInstagram, 300),
    ownerFacebook: safe(body.ownerFacebook, 300),
    ownerLinkedin: safe(body.ownerLinkedin, 300),
    ownerYoutube: safe(body.ownerYoutube, 300),
    ownerTelegram: safe(body.ownerTelegram, 300),
    ownerTwitter: safe(body.ownerTwitter, 300),
    heroTitle: safe(body.heroTitle, 200),
    heroSubtitle: safe(body.heroSubtitle, 300),
    heroBgUrl: safe(body.heroBgUrl, 500),
    logoUrl: safe(body.logoUrl, 500),
    ogImageUrl: safe(body.ogImageUrl, 500),
    whatsappMessage: safe(body.whatsappMessage, 500),
    metaTitle: safe(body.metaTitle, 200),
    metaDescription: safe(body.metaDescription, 500),
    footerText: safe(body.footerText, 500),
    // v1.1
    ga4Id: safe(body.ga4Id, 40),
    metaPixelId: safe(body.metaPixelId, 40),
    gtmId: safe(body.gtmId, 40),
    privacyPolicy: safe(body.privacyPolicy, 30000),
    termsOfUse: safe(body.termsOfUse, 30000),
    businessHours: safe(body.businessHours, 200),
    googleBusinessUrl: safe(body.googleBusinessUrl, 500),
    mapEmbedUrl: safe(body.mapEmbedUrl, 1000),
    showDestaques:   typeof body.showDestaques   === 'boolean' ? body.showDestaques   : undefined,
    showCompra:      typeof body.showCompra      === 'boolean' ? body.showCompra      : undefined,
    showLocacao:     typeof body.showLocacao     === 'boolean' ? body.showLocacao     : undefined,
    showApartamentos:typeof body.showApartamentos=== 'boolean' ? body.showApartamentos: undefined,
    showCasas:       typeof body.showCasas       === 'boolean' ? body.showCasas       : undefined,
    showTerrenos:    typeof body.showTerrenos    === 'boolean' ? body.showTerrenos    : undefined,
  }

  // Remover campos undefined para não sobrescrever com null
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  )

  const existing = await prisma.siteConfig.findFirst()
  if (existing) {
    await prisma.siteConfig.update({ where: { id: existing.id }, data: cleanData })
  } else {
    await prisma.siteConfig.create({ data: cleanData as Parameters<typeof prisma.siteConfig.create>[0]['data'] })
  }

  // v1.1: páginas públicas em cache são renovadas na hora
  for (const p of ['/', '/contato', '/sobre', '/politica-de-privacidade', '/termos-de-uso', '/imoveis', '/empreendimentos', '/blog']) revalidatePath(p)
  revalidatePath('/', 'layout')

  revalidateSite('config')
  return NextResponse.json({ success: true })
}
