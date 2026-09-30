export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { readJsonObject } from '@/lib/json-body'
import { guardStudy } from '@/lib/study-guard'
import { portalFromUrl } from '@/lib/market-study'
import { readListingFromUrl, PortalReadError } from '@/lib/portal-reader/read'
import { parseListingText } from '@/lib/portal-reader/parse'
import { checkRateLimit } from '@/lib/rateLimit'

/**
 * v1.2 — "Colar link do anúncio": o servidor lê a página do portal e devolve os campos que conseguiu identificar.
 * v1.4 — usa o leitor de portais (metatags, JSON-LD, dados embutidos e padrões de texto), com proteção
 * contra endereços internos, e aceita também o TEXTO do anúncio colado (quando o portal bloqueia a leitura).
 * Nada é gravado aqui; o corretor confere e salva.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guardStudy(params.id)
  if (g.response) return g.response
  if (!checkRateLimit(`amostra-link:${g.user.id}`, 40, 60_000)) return NextResponse.json({ error: 'Muitas leituras em um minuto. Aguarde um pouco.' }, { status: 429 })

  const { url, text } = await readJsonObject(req, 400_000) as { url?: string; text?: string }
  let d
  if (typeof text === 'string' && text.trim().length >= 20) {
    d = parseListingText(text.slice(0, 20_000), typeof url === 'string' ? url.slice(0, 1000) : null)
  } else {
    if (!url || !/^https:\/\//i.test(url)) return NextResponse.json({ error: 'Cole o link completo do anúncio (https://…)' }, { status: 400 })
    try { d = await readListingFromUrl(url, { anyHost: true }) } catch (e) {
      if (e instanceof PortalReadError) return NextResponse.json({ error: e.message, blocked: e.blocked }, { status: e.status })
      return NextResponse.json({ error: 'Não foi possível ler o anúncio. Preencha a amostra à mão.' }, { status: 502 })
    }
  }
  const link = d.url ?? (typeof url === 'string' ? url : null)
  return NextResponse.json({
    sample: {
      url: link, portal: d.portal ?? (link ? portalFromUrl(link) : null), advertiser: d.advertiser, location: d.address ?? d.title, price: d.price, areaPrivate: d.usefulArea, areaTotal: d.totalArea,
      bedrooms: d.bedrooms, suites: d.suites, bathrooms: d.bathrooms, parking: d.parking, condoFee: d.condoFee, publishedAt: d.publishedAt, floor: d.floor, sunPosition: d.sunPosition, renovation: d.renovation,
      photoUrl: d.photoUrls[0] ?? null, notes: d.description ? d.description.slice(0, 500) : null, status: 'VALID', tags: [], origin: 'LINK',
    },
    confidence: { price: d.price != null, areaPrivate: d.usefulArea != null, bedrooms: d.bedrooms != null },
  })
}
