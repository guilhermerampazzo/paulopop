export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readUploadFile } from '@/lib/upload'
import { safeFetch } from '@/lib/net/safe-fetch'
import { SITE_URL } from '@/lib/site'

/**
 * v1.4 — Foto principal do imóvel pronta para compartilhar.
 *  - padrão: 1200×630 JPEG (og:image — prévia do link no WhatsApp, Facebook, Telegram…);
 *  - ?modo=foto: a foto inteira, sem corte, até 1600 px (anexo do botão "Compartilhar imóvel").
 * Só imóveis publicados. Sem foto → imagem padrão do site.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const fallback = () => NextResponse.redirect(`${SITE_URL}/og-default.jpg`, 302)
  const property = await prisma.property.findFirst({
    where: { id: params.id, status: { in: ['ACTIVE', 'SOLD', 'RENTED'] }, hideOnSite: false },
    select: { images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: 1, select: { url: true } } },
  })
  const url = property?.images[0]?.url
  if (!url) return fallback()

  let source: Buffer | null = null
  try {
    if (url.startsWith('/uploads/')) source = await readUploadFile(url)
    else if (/^https:\/\//i.test(url)) {
      const r = await safeFetch(url, { accept: 'image/*', maxBytes: 15 * 1024 * 1024, timeoutMs: 12000 })
      if (r.status === 200 && r.contentType.startsWith('image/')) source = r.body
    }
  } catch { source = null }
  if (!source) return fallback()

  try {
    const sharp = (await import('sharp')).default
    const whole = req.nextUrl.searchParams.get('modo') === 'foto'
    const img = sharp(source).rotate()
    const out = whole
      ? await img.resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toBuffer()
      : await img.resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80, mozjpeg: true }).toBuffer()
    return new NextResponse(new Uint8Array(out), {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' },
    })
  } catch {
    return fallback()
  }
}
