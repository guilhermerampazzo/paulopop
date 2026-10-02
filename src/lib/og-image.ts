import { NextRequest, NextResponse } from 'next/server'
import { readUploadFile } from '@/lib/upload'
import { safeFetch } from '@/lib/net/safe-fetch'
import { SITE_URL } from '@/lib/site'

/**
 * v1.5 — Monta a imagem de compartilhamento a partir de uma foto do site (upload ou https).
 * Extraído da rota do imóvel (v1.4) para servir também aos empreendimentos.
 *  - padrão: 1200×630 JPEG (og:image);
 *  - ?modo=foto: a foto inteira, sem corte, até 1600 px.
 * Sem foto ou foto ilegível → imagem padrão do site.
 */
export function ogFallback() {
  return NextResponse.redirect(`${SITE_URL}/og-default.jpg`, 302)
}

export async function ogImageResponse(req: NextRequest, url: string | null | undefined): Promise<NextResponse> {
  if (!url) return ogFallback()
  let source: Buffer | null = null
  try {
    if (url.startsWith('/uploads/')) source = await readUploadFile(url)
    else if (/^https:\/\//i.test(url)) {
      const r = await safeFetch(url, { accept: 'image/*', maxBytes: 15 * 1024 * 1024, timeoutMs: 12000 })
      if (r.status === 200 && r.contentType.startsWith('image/')) source = r.body
    }
  } catch { source = null }
  if (!source) return ogFallback()

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
    return ogFallback()
  }
}

/** JSON para <script type="application/ld+json"> sem permitir fechar a tag com "</script>". */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
