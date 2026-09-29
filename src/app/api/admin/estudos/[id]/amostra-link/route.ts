export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, isAdmin } from '@/lib/authz'
import { portalFromUrl } from '@/lib/market-study'

/**
 * v1.2 — "Colar link do anúncio": o servidor lê a página do portal (DF Imóveis, WImóveis, OLX…) e
 * devolve os campos que conseguiu identificar (preço, áreas, quartos, banheiros, vagas, foto, título, data).
 * Leitura de melhor esforço: og:*, JSON-LD e padrões de texto. Nada é gravado; o corretor confere e salva.
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'

function meta(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i')
  return (html.match(re)?.[1] ?? html.match(re2)?.[1] ?? null)?.replace(/&amp;/g, '&') ?? null
}

function text(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
}

function brl(s: string | null | undefined): number | null {
  if (!s) return null
  const m = s.replace(/\s/g, '').match(/R?\$?\s?([\d.]{1,12}),?(\d{0,2})/)
  if (!m) return null
  const v = Number(m[1].replace(/\./g, '') + (m[2] ? '.' + m[2] : ''))
  return Number.isFinite(v) && v > 1000 ? v : null
}

function firstNum(t: string, re: RegExp): number | null {
  const m = t.match(re)
  if (!m) return null
  const v = Number(String(m[1]).replace('.', '').replace(',', '.'))
  return Number.isFinite(v) ? v : null
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession()
  if (auth.response) return auth.response
  const study = await prisma.marketStudy.findUnique({ where: { id: params.id }, select: { agentId: true } })
  if (!study) return NextResponse.json({ error: 'Estudo não encontrado' }, { status: 404 })
  if (!isAdmin(auth.user) && study.agentId !== auth.user.id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { url } = await req.json().catch(() => ({})) as { url?: string }
  if (!url || !/^https?:\/\//i.test(url)) return NextResponse.json({ error: 'Cole o link completo do anúncio (https://…)' }, { status: 400 })

  let html = ''
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,*/*', 'accept-language': 'pt-BR,pt;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(15000), cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: `O portal respondeu ${res.status}. Preencha a amostra à mão ou tente de novo mais tarde.`, blocked: res.status === 403 || res.status === 429 }, { status: 502 })
    html = await res.text()
  } catch (e) {
    return NextResponse.json({ error: `Não foi possível ler o anúncio (${e instanceof Error ? e.message : 'erro'}). Preencha a amostra à mão.` }, { status: 502 })
  }

  const t = text(html)
  const title = meta(html, 'og:title') ?? html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? null
  const description = meta(html, 'og:description') ?? meta(html, 'description')
  const photoUrl = meta(html, 'og:image')

  // JSON-LD (Offer/Product/Residence) quando existir
  let ldPrice: number | null = null
  let ldArea: number | null = null
  for (const m of Array.from(html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi))) {
    try {
      const j = JSON.parse(m[1])
      const arr = Array.isArray(j) ? j : [j]
      for (const o of arr) {
        const offers = o?.offers ?? o?.['@graph']?.find?.((x: { offers?: unknown }) => x.offers)?.offers
        const p = Number(offers?.price ?? offers?.lowPrice ?? o?.price)
        if (!ldPrice && Number.isFinite(p) && p > 1000) ldPrice = p
        const fs = Number(o?.floorSize?.value ?? o?.floorSize)
        if (!ldArea && Number.isFinite(fs) && fs > 10) ldArea = fs
      }
    } catch { /* ignora JSON-LD inválido */ }
  }

  const priceText = t.match(/R\$\s?[\d.]{3,12}(?:,\d{2})?/g)?.map(brl).filter((v): v is number => !!v) ?? []
  const price = ldPrice ?? brl(meta(html, 'product:price:amount')) ?? (priceText.length ? priceText.sort((a, b) => b - a)[0] : null)
  const areaPrivate = ldArea ?? firstNum(t, /(\d{2,4}(?:[.,]\d{1,2})?)\s?m²?\s?(?:priv|útil|util)/i) ?? firstNum(t, /(?:área|area)\s?(?:privativa|útil|util)?[:\s]*(\d{2,4}(?:[.,]\d{1,2})?)\s?m/i) ?? firstNum(t, /(\d{2,4}(?:[.,]\d{1,2})?)\s?m²/i)
  const areaTotal = firstNum(t, /(\d{2,4}(?:[.,]\d{1,2})?)\s?m²?\s?(?:total)/i) ?? firstNum(t, /(?:área|area)\s?total[:\s]*(\d{2,4}(?:[.,]\d{1,2})?)/i)
  const bedrooms = firstNum(t, /(\d)\s?(?:quartos?|dormit[óo]rios?|dorms?\b)/i)
  const bathrooms = firstNum(t, /(\d)\s?banheiros?/i)
  const parking = firstNum(t, /(\d)\s?(?:vagas?|garagens?)/i)
  const condoFee = brl(t.match(/condom[ií]nio[:\s]*R\$\s?[\d.]{2,9}(?:,\d{2})?/i)?.[0] ?? null)
  const dateM = t.match(/(?:publicado|anunciado|criado)\s?(?:em|há)?[:\s]*(\d{2}\/\d{2}\/\d{4})/i)
  const daysM = t.match(/(?:publicado|anunciado)\s?há\s?(\d{1,3})\s?dias?/i)
  const publishedAt = dateM ? dateM[1].split('/').reverse().join('-') : daysM ? new Date(Date.now() - Number(daysM[1]) * 86_400_000).toISOString().slice(0, 10) : null
  const floor = t.match(/(\d{1,2})[ºo°]?\s?andar/i)?.[1] ?? (/t[ée]rreo/i.test(t) ? 'Térreo' : null)
  const sunPosition = /nascente/i.test(t) ? 'Nascente' : /poente/i.test(t) ? 'Poente' : null
  const renovation = /reformad[oa]/i.test(t) ? 'Reformado' : /planejad[oa]s?/i.test(t) ? 'Com planejados' : null

  return NextResponse.json({
    sample: {
      url, portal: portalFromUrl(url), advertiser: null, location: title, price, areaPrivate, areaTotal, bedrooms, bathrooms, parking,
      condoFee, publishedAt, floor, sunPosition, renovation, photoUrl, notes: description ? description.slice(0, 500) : null, status: 'VALID', tags: [],
    },
    confidence: { price: !!price, areaPrivate: !!areaPrivate, bedrooms: bedrooms != null },
  })
}
