export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rateLimit'
import { stripHtml, limitString } from '@/lib/sanitize'
import { estimateRange, type Condition, type SampleRow } from '@/lib/valuation'
import { formatDuration } from '@/lib/sales'
import { sendLeadNotificationToAgent } from '@/lib/email'

/**
 * v1.3 — Avaliação online: calcula a faixa de preço com os anúncios/vendas do site, registra o lead e devolve o resultado.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'anon'
  if (!checkRateLimit(`vender:${ip}`, 5, 60 * 60 * 1000)) return NextResponse.json({ error: 'Muitas solicitações. Tente novamente mais tarde.' }, { status: 429 })

  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const name = limitString(stripHtml(String(b.name ?? '')), 150)
  const phone = limitString(stripHtml(String(b.phone ?? '')), 30)
  if (!name || phone.replace(/\D/g, '').length < 10 || !b.consent) return NextResponse.json({ error: 'Informe nome, WhatsApp e aceite a política de privacidade.' }, { status: 400 })
  const email = b.email ? limitString(stripHtml(String(b.email)), 200) : null
  const city = limitString(stripHtml(String(b.city ?? '')), 80)
  const neighborhood = limitString(stripHtml(String(b.neighborhood ?? '')), 80)
  const empreendimentoId = typeof b.empreendimentoId === 'string' ? b.empreendimentoId : null
  const propertyType = limitString(stripHtml(String(b.propertyType ?? 'Apartamento')), 40)
  const transactionType = b.transactionType === 'RENT' ? 'RENT' : 'SALE'
  const area = Math.max(0, Number(b.area) || 0)
  const condition = (['ORIGINAL', 'PARCIAL', 'TOTAL'].includes(String(b.condition)) ? String(b.condition) : 'PARCIAL') as Condition
  const photos = Array.isArray(b.photos) ? (b.photos as unknown[]).filter(p => typeof p === 'string' && String(p).startsWith('/')).slice(0, 6) as string[] : []

  // Amostras do próprio site
  const rows = await prisma.property.findMany({
    where: { status: 'ACTIVE', hideOnSite: false, transactionType, price: { gt: 0 }, propertyType: { equals: propertyType, mode: 'insensitive' }, OR: [
      ...(empreendimentoId ? [{ empreendimentoId }] : []),
      ...(neighborhood ? [{ neighborhood: { contains: neighborhood, mode: 'insensitive' as const } }] : []),
      ...(city ? [{ city: { contains: city, mode: 'insensitive' as const } }] : []),
    ] },
    select: { price: true, usefulArea: true, totalArea: true, empreendimentoId: true, neighborhood: true },
    take: 200,
  })
  const samples: SampleRow[] = rows.map(r => {
    const a = Number(r.usefulArea ?? r.totalArea ?? 0)
    const scope = empreendimentoId && r.empreendimentoId === empreendimentoId ? 'predio' : neighborhood && r.neighborhood && r.neighborhood.toLowerCase().includes(neighborhood.toLowerCase()) ? 'bairro' : 'cidade'
    return { price: Number(r.price), area: a, scope }
  })
  const result = estimateRange({ area, condition, samples })

  let buildingReport: { name: string; sold: number; avgDays: number | null; avgSqm: number | null } | null = null
  if (empreendimentoId) {
    const emp = await prisma.empreendimento.findUnique({ where: { id: empreendimentoId }, select: { name: true } })
    const sold = await prisma.property.findMany({ where: { empreendimentoId, status: { in: ['SOLD', 'RENTED'] } }, select: { daysOnMarket: true, salePrice: true, usefulArea: true, totalArea: true } })
    const days = sold.map(s => s.daysOnMarket).filter((v): v is number => v != null)
    const sq = sold.map(s => s.salePrice && (s.usefulArea ?? s.totalArea) ? Number(s.salePrice) / Number(s.usefulArea ?? s.totalArea) : null).filter((v): v is number => !!v)
    if (emp) buildingReport = { name: emp.name, sold: sold.length, avgDays: days.length ? Math.round(days.reduce((a, c) => a + c, 0) / days.length) : null, avgSqm: sq.length ? Math.round(sq.reduce((a, c) => a + c, 0) / sq.length) : null }
  }

  const brl = (v: number | null) => v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
  const message = [
    'AVALIAÇÃO ONLINE (site)',
    `Tipo: ${propertyType} · ${transactionType === 'RENT' ? 'Locação' : 'Venda'}`,
    `Local: ${[neighborhood, city].filter(Boolean).join(' – ') || '—'}${buildingReport ? ` · Prédio: ${buildingReport.name}` : ''}`,
    `Área útil: ${area || '—'} m² · Quartos: ${b.bedrooms ?? '—'} · Suítes: ${b.suites ?? '—'} · Vagas: ${b.parking ?? '—'} · Andar: ${b.floor ?? '—'} · Estado: ${condition}`,
    b.address ? `Endereço: ${limitString(stripHtml(String(b.address)), 200)}` : '',
    result.basis.scope === 'insuficiente' ? 'Faixa: amostras insuficientes (avaliar pessoalmente)' : `Faixa calculada: ${brl(result.low)} a ${brl(result.high)} (R$/m² ${result.sqm}, ${result.basis.count} amostras ${result.basis.scope})`,
    photos.length ? `Fotos: ${photos.join(' ')}` : '',
  ].filter(Boolean).join('\n')

  const lead = await prisma.lead.create({ data: { name, phone, email, message, source: 'SITE', status: 'NEW' } })
  void sendLeadNotificationToAgent({ name, email, phone, message, propertyTitle: 'Avaliação online', propertyRef: null, agentEmail: null, agentName: null, propertyUrl: null }).catch(() => {})

  return NextResponse.json({ ok: true, leadId: lead.id, ...result, buildingReport: buildingReport ? { ...buildingReport, avgDaysLabel: buildingReport.avgDays != null ? formatDuration(buildingReport.avgDays) : null } : null })
}
