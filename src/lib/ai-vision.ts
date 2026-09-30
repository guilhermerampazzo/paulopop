/**
 * v1.3 — IA de visão (Gemini): identifica piso, forro, pintura, armários e estado geral pelas fotos
 * de uma amostra ou do imóvel avaliado (Estudo de mercado). Sem chave → AiUnavailableError.
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import { AiUnavailableError } from './ai-sections'
import { SITE_URL } from './site'
import { safeFetch } from './net/safe-fetch'

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const MAX_IMAGES = 6
const MAX_BYTES = 4 * 1024 * 1024

export interface FinishAnalysis {
  piso: string; forro: string; pintura: string; armarios: string; esquadrias: string
  estadoGeral: 'ótimo' | 'bom' | 'regular' | 'ruim' | string
  reforma: 'não' | 'parcial' | 'completa' | string
  resumo: string
  confianca: number // 0–100
  fotosAnalisadas: number
}

async function loadImage(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    // v1.4: foto do próprio site (caminho relativo) é lida direto; endereço externo passa pelo leitor seguro
    // (só https, sem rede interna), porque o endereço vem de campo preenchido no painel ou pelo conector.
    if (url.startsWith('/') && !url.startsWith('//')) {
      const res = await fetch(`${SITE_URL}${url}`, { signal: AbortSignal.timeout(10000), cache: 'no-store' })
      if (!res.ok) return null
      const type = res.headers.get('content-type') ?? ''
      if (!/image\/(jpeg|png|webp)/.test(type)) return null
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length > MAX_BYTES) return null
      return { mimeType: type.split(';')[0], data: buf.toString('base64') }
    }
    const r = await safeFetch(url, { accept: 'image/webp,image/jpeg,image/png', maxBytes: MAX_BYTES, timeoutMs: 10000 })
    if (r.status !== 200 || !/image\/(jpeg|png|webp)/.test(r.contentType)) return null
    return { mimeType: r.contentType.split(';')[0], data: r.body.toString('base64') }
  } catch { return null }
}

export async function analyzeFinishes(imageUrls: string[]): Promise<FinishAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new AiUnavailableError()
  const images = (await Promise.all(imageUrls.slice(0, MAX_IMAGES).map(loadImage))).filter((x): x is { mimeType: string; data: string } => !!x)
  if (!images.length) throw new Error('Nenhuma foto pôde ser carregada para análise.')
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: GEMINI_MODEL, generationConfig: { responseMimeType: 'application/json' } })
  const prompt = `Você é um avaliador imobiliário no Brasil. Analise as fotos de um imóvel e responda SOMENTE um JSON com as chaves:
piso (porcelanato | cerâmica | laminado | vinílico | granito | madeira | cimento queimado | outro | não visível),
forro (laje aparente | gesso liso | gesso rebaixado com sanca | PVC | madeira | não visível),
pintura (nova | boa | desgastada | com infiltração | não visível),
armarios (planejados | avulsos | sem | não visível),
esquadrias (alumínio | madeira | ferro | PVC | não visível),
estadoGeral (ótimo | bom | regular | ruim),
reforma (não | parcial | completa),
resumo (uma frase em português, até 160 caracteres, útil para um estudo de mercado),
confianca (número 0 a 100).`
  const result = await model.generateContent([prompt, ...images.map(i => ({ inlineData: i }))])
  const text = result.response.text().replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  const j = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as Partial<FinishAnalysis>
  const s = (v: unknown, max = 60) => String(v ?? 'não visível').trim().slice(0, max)
  return {
    piso: s(j.piso), forro: s(j.forro), pintura: s(j.pintura), armarios: s(j.armarios), esquadrias: s(j.esquadrias),
    estadoGeral: s(j.estadoGeral, 20), reforma: s(j.reforma, 20), resumo: s(j.resumo, 200),
    confianca: Math.max(0, Math.min(100, Math.round(Number(j.confianca) || 0))), fotosAnalisadas: images.length,
  }
}
