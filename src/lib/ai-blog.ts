/**
 * v1.3 — "Escrever com IA" do blog: Gemini gera um rascunho de post em pt-BR
 * (título, resumo, corpo em HTML, tags e SEO). Mesmo padrão de `ai-sections.ts`:
 * sem chave → `AiUnavailableError` (a rota responde 503).
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import { sanitizeHtml, stripHtml, limitString } from './sanitize'
import { BLOG_CATEGORIES } from './blog'

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

export class AiUnavailableError extends Error {
  constructor() { super('Geração com IA indisponível: configure GEMINI_API_KEY no servidor.') }
}

export function aiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new AiUnavailableError()
  return new GoogleGenerativeAI(apiKey)
}

async function callGemini(prompt: string): Promise<string> {
  const client = getClient()
  const model = client.getGenerativeModel({ model: GEMINI_MODEL })
  try {
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (error) {
    if (error instanceof Error && /not found|not supported/i.test(error.message)) {
      throw new Error(`Modelo Gemini indisponível: ${GEMINI_MODEL}. Configure GEMINI_MODEL com um modelo válido.`)
    }
    throw error
  }
}

function extractJson<T>(text: string): T {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as T
    throw new Error('Resposta da IA em formato JSON inválido')
  }
}

const txt = (v: unknown, max: number) => limitString(stripHtml(String(v ?? '')), max).replace(/\s+/g, ' ').trim()

export interface BlogAiInput {
  topic: string
  category?: string
  city?: string
}

export interface BlogAiOutput {
  title: string
  excerpt: string
  contentHtml: string
  tags: string[]
  seoTitle: string
  seoDescription: string
  warning: string
}

interface BlogAiJson {
  title?: string
  excerpt?: string
  contentHtml?: string
  tags?: unknown
  seoTitle?: string
  seoDescription?: string
}

export const BLOG_AI_WARNING = 'Rascunho gerado por IA: revise o texto, confira números e fontes e ajuste o tom antes de publicar.'

export async function generateBlogDraft(input: BlogAiInput): Promise<BlogAiOutput> {
  const topic = txt(input.topic, 300)
  if (!topic) throw new Error('Informe o tema do post.')
  const category = txt(input.category, 60)
  const city = txt(input.city, 80)

  const prompt = `Você é redator do blog de um corretor de imóveis brasileiro (Paulo Pop, RE/MAX, Distrito Federal).
Escreva um post de blog em português do Brasil, tom informativo, cordial e direto, útil para quem quer comprar, vender ou alugar imóvel no DF.
Não invente números precisos, leis com artigo, taxas ou nomes de pessoas; quando citar dados, use aproximações ("cerca de") e indique a fonte provável (IBGE, Codeplan/IPEDF, Banco Central, Caixa).
Não use clichês de marketing nem promessas de retorno financeiro.

Tema: ${topic}
${category ? `Categoria: ${category} (categorias do blog: ${BLOG_CATEGORIES.join(', ')})` : ''}
${city ? `Cidade/região do DF em foco: ${city}` : ''}

Retorne APENAS um JSON válido, sem markdown, no formato:
{
  "title": "título atraente com até 70 caracteres",
  "excerpt": "resumo de 1 a 2 frases (até 220 caracteres)",
  "contentHtml": "corpo em HTML simples: introdução em <p>, 4 a 7 seções com <h2>, subtítulos <h3> quando fizer sentido, listas <ul>/<li>, <strong> para destaques, e um fechamento convidando a falar com o corretor. Entre 700 e 1200 palavras. Sem <h1>, sem <html>/<body>, sem imagens.",
  "tags": ["3 a 6 tags curtas em minúsculas"],
  "seoTitle": "título para o Google com até 60 caracteres",
  "seoDescription": "meta description com até 155 caracteres"
}`

  const raw = await callGemini(prompt)
  const j = extractJson<BlogAiJson>(raw)

  const tags = (Array.isArray(j.tags) ? j.tags : [])
    .map(t => txt(t, 40).toLowerCase())
    .filter(Boolean)
    .filter((t, i, a) => a.indexOf(t) === i)
    .slice(0, 8)

  return {
    title: txt(j.title, 200),
    excerpt: txt(j.excerpt, 500),
    contentHtml: sanitizeHtml(String(j.contentHtml ?? '').replace(/```html?/gi, '').replace(/```/g, '')),
    tags,
    seoTitle: txt(j.seoTitle, 70),
    seoDescription: txt(j.seoDescription, 200),
    warning: BLOG_AI_WARNING,
  }
}
