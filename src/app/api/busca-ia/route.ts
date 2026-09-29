export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { checkRateLimit } from '@/lib/rateLimit'
import { getActiveCitiesCached } from '@/lib/cache'

/**
 * v1.3 — Busca conversacional: "apartamento de 2 quartos até 320 mil perto do metrô em Samambaia Sul"
 * → filtros da lista /imoveis. Sem GEMINI_API_KEY → 503 (o site cai na busca normal).
 */
interface Filters { transactionType?: 'SALE' | 'RENT'; propertyType?: string; city?: string; neighborhood?: string; minPrice?: number; maxPrice?: number; bedrooms?: number; parking?: number; nearMetro?: boolean; keywords?: string }

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
  if (!checkRateLimit(`busca-ia:${ip}`, 20, 60 * 60 * 1000)) return NextResponse.json({ error: 'Muitas buscas. Tente de novo em instantes.' }, { status: 429 })
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Busca com IA indisponível' }, { status: 503 })
  const { text } = await req.json().catch(() => ({})) as { text?: string }
  const q = String(text ?? '').trim().slice(0, 300)
  if (q.length < 3) return NextResponse.json({ error: 'Descreva o que procura' }, { status: 400 })
  const cities = await getActiveCitiesCached().catch(() => [] as string[])
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', generationConfig: { responseMimeType: 'application/json' } })
  const prompt = `Converta o pedido de um comprador/locatário de imóvel no Distrito Federal em filtros JSON. Chaves permitidas: transactionType ("SALE" ou "RENT"), propertyType (Apartamento, Casa, Cobertura, Kitnet, Terreno, Sala Comercial, Loja), city (uma destas quando possível: ${cities.join(', ')}), neighborhood, minPrice, maxPrice (números em reais; "320 mil" = 320000), bedrooms (número), parking (número), nearMetro (boolean), keywords (texto curto com o que não coube nos filtros). Omita o que não foi dito. Pedido: """${q}"""`
  try {
    const r = await model.generateContent(prompt)
    const f = JSON.parse(r.response.text().match(/\{[\s\S]*\}/)?.[0] ?? '{}') as Filters
    const p = new URLSearchParams()
    if (f.transactionType === 'RENT') p.set('transacao', 'alugar'); else if (f.transactionType === 'SALE') p.set('transacao', 'comprar')
    if (f.propertyType) p.set('tipo', String(f.propertyType).slice(0, 40))
    if (f.city) p.set('cidade', String(f.city).slice(0, 60))
    if (f.minPrice) p.set('precoMin', String(Math.round(Number(f.minPrice))))
    if (f.maxPrice) p.set('precoMax', String(Math.round(Number(f.maxPrice))))
    if (f.bedrooms) p.set('quartos', String(Math.min(4, Math.max(1, Math.round(Number(f.bedrooms))))))
    const busca = [f.neighborhood, f.nearMetro ? 'metrô' : '', f.keywords].filter(Boolean).join(' ').trim()
    if (busca) p.set('busca', busca.slice(0, 120))
    return NextResponse.json({ filters: f, url: `/imoveis?${p.toString()}` })
  } catch {
    return NextResponse.json({ error: 'Não entendi o pedido' }, { status: 500 })
  }
}
