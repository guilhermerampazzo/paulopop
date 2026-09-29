/**
 * v1.3 — IA (Gemini) para o editor de seções e para o rascunho das páginas de cidade.
 * Segue o mesmo padrão de `src/lib/ai.ts` (getClient/generateContent); sem chave → erro
 * `AiUnavailableError`, que as rotas transformam em 503.
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import { sanitizeHtml } from './sanitize'
import { newId, type Section, type SectionType, type FaqEntry, type ItemEntry, type TimelineEntry, type PersonEntry, type StatEntry } from './sections'

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
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/)
    if (match) return JSON.parse(match[0]) as T
    throw new Error('Resposta da IA em formato JSON inválido')
  }
}

const str = (v: unknown, max = 2000) => String(v ?? '').replace(/\0/g, '').trim().slice(0, max)

// ─── Conteúdo de uma seção (botão "Gerar com IA") ─────────────────────────

export type SectionAiType = Extract<SectionType, 'text' | 'faq' | 'items'>

export interface SectionAiInput {
  type: SectionAiType
  title?: string
  /** Contexto livre: nome da cidade/parceiro, tipo de página, instruções extras. */
  context?: string
}

export type SectionAiOutput =
  | { type: 'text'; html: string }
  | { type: 'faq'; entries: FaqEntry[] }
  | { type: 'items'; items: ItemEntry[] }

export async function generateSectionContent(input: SectionAiInput): Promise<SectionAiOutput> {
  const base = `Você é redator de um site imobiliário brasileiro (corretor Paulo Pop, RE/MAX, Distrito Federal).
Escreva em português do Brasil, tom informativo e cordial, sem clichês e sem inventar dados numéricos precisos que não tenha certeza.
Contexto da página: ${str(input.context, 1500) || 'não informado'}.
Título da seção: ${str(input.title, 200) || 'não informado'}.`

  if (input.type === 'text') {
    const text = await callGemini(`${base}

Escreva o conteúdo da seção em HTML simples (apenas <h3>, <p>, <ul>, <li>, <strong>, <em>), com 3 a 6 parágrafos curtos.
Se citar fatos históricos ou números, use frases como "segundo a Codeplan/IBGE" e evite precisão falsa.
Retorne APENAS o HTML, sem markdown e sem <html>/<body>.`)
    return { type: 'text', html: sanitizeHtml(text.replace(/```html?/gi, '').replace(/```/g, '')) }
  }

  if (input.type === 'faq') {
    const text = await callGemini(`${base}

Crie de 5 a 8 perguntas frequentes que um cliente faria sobre este assunto, com respostas objetivas (2 a 4 frases cada).
Retorne APENAS um JSON válido no formato: [{"question": "...", "answer": "..."}]`)
    const arr = extractJson<Array<{ question?: string; answer?: string }>>(text)
    const entries: FaqEntry[] = (Array.isArray(arr) ? arr : []).slice(0, 12)
      .filter(e => e && e.question)
      .map(e => ({ id: newId(), question: str(e.question, 300), answer: sanitizeHtml(str(e.answer, 2000)) }))
    return { type: 'faq', entries }
  }

  const text = await callGemini(`${base}

Liste de 5 a 10 itens relevantes para esta seção (por exemplo: locais para visitar, escolas, comércio, serviços).
Para cada item informe: title (nome), text (1 a 3 frases), address (endereço aproximado, se souber, senão vazio), badge (categoria curta, opcional).
Não invente telefones nem links. Retorne APENAS um JSON válido: [{"title":"...","text":"...","address":"...","badge":"..."}]`)
  const arr = extractJson<Array<{ title?: string; text?: string; address?: string; badge?: string }>>(text)
  const items: ItemEntry[] = (Array.isArray(arr) ? arr : []).slice(0, 15)
    .filter(e => e && e.title)
    .map(e => ({ id: newId(), title: str(e.title, 200), text: str(e.text, 1500), address: str(e.address, 300) || undefined, badge: str(e.badge, 60) || undefined }))
  return { type: 'items', items }
}

// ─── Rascunho da página de cidade ─────────────────────────────────────────

export interface CityDraft {
  history: Section
  timeline: Section
  people: Section
  stats: Section
  places: Section
  warning: string
}

interface CityDraftJson {
  historyHtml?: string
  timeline?: Array<{ year?: string; title?: string; text?: string }>
  people?: Array<{ name?: string; role?: string; period?: string; text?: string }>
  stats?: Array<{ label?: string; value?: string; source?: string }>
  places?: Array<{ title?: string; text?: string; address?: string; badge?: string }>
}

export async function generateCityDraft(cityName: string, extra?: { raNumber?: string | null; foundedAt?: string | null }): Promise<CityDraft> {
  const prompt = `Você é pesquisador e redator de um site imobiliário do Distrito Federal (Brasil).
Monte um rascunho de página sobre a região administrativa "${str(cityName, 100)}" (DF)${extra?.raNumber ? `, RA ${str(extra.raNumber, 20)}` : ''}${extra?.foundedAt ? `, fundada em ${str(extra.foundedAt, 40)}` : ''}.
Escreva em português do Brasil. Seja fiel aos fatos conhecidos; quando não tiver certeza de um número ou data, use aproximação explícita ("cerca de", "década de") e indique a fonte provável (Codeplan/IPEDF, IBGE, GDF, Administração Regional).

Retorne APENAS um JSON válido com este formato:
{
  "historyHtml": "HTML simples (<p>, <h3>, <ul>, <li>, <strong>) com 4 a 7 parágrafos contando como a cidade surgiu, o crescimento e como é hoje",
  "timeline": [{"year": "1989", "title": "...", "text": "..."}],            // 6 a 10 marcos
  "people": [{"name": "...", "role": "governador | administrador regional | deputado distrital", "period": "...", "text": "..."}],  // 4 a 8 nomes ligados à cidade
  "stats": [{"label": "População", "value": "...", "source": "PDAD/Codeplan"}], // 4 a 6 números (população, área, distância ao Plano Piloto, renda média, etc.)
  "places": [{"title": "...", "text": "...", "address": "...", "badge": "Parque | Cultura | Lazer | Compras"}] // 5 a 10 locais para visitar
}`
  const text = await callGemini(prompt)
  const j = extractJson<CityDraftJson>(text)
  const mk = (type: SectionType, title: string, anchor: string) => ({ id: newId(), type, title, anchor, visible: true })

  const timeline: TimelineEntry[] = (j.timeline ?? []).slice(0, 12).filter(e => e && (e.year || e.title))
    .map(e => ({ id: newId(), year: str(e.year, 20), title: str(e.title, 200), text: str(e.text, 1500) }))
  const people: PersonEntry[] = (j.people ?? []).slice(0, 12).filter(e => e && e.name)
    .map(e => ({ id: newId(), name: str(e.name, 150), role: str(e.role, 150), period: str(e.period, 80), text: str(e.text, 1500) }))
  const stats: StatEntry[] = (j.stats ?? []).slice(0, 8).filter(e => e && e.label)
    .map(e => ({ id: newId(), label: str(e.label, 80), value: str(e.value, 80), source: str(e.source, 150) }))
  const places: ItemEntry[] = (j.places ?? []).slice(0, 12).filter(e => e && e.title)
    .map(e => ({ id: newId(), title: str(e.title, 200), text: str(e.text, 1500), address: str(e.address, 300) || undefined, badge: str(e.badge, 60) || undefined }))

  return {
    history: { ...mk('text', `História de ${cityName}: como surgiu`, 'historia'), type: 'text', html: sanitizeHtml(str(j.historyHtml, 20000)) },
    timeline: { ...mk('timeline', 'Linha do tempo', 'linha-do-tempo'), type: 'timeline', entries: timeline },
    people: { ...mk('people', 'Nomes importantes: governadores, administradores e deputados', 'nomes'), type: 'people', people },
    stats: { ...mk('stats', `${cityName} em números`, 'numeros'), type: 'stats', stats },
    places: { ...mk('items', 'Locais para visitar', 'visitar'), type: 'items', items: places, layout: 'cards', columns: 3 },
    warning: 'Rascunho gerado por IA: revise cada informação, confira datas e números e cite as fontes (Codeplan/IPEDF, IBGE, Administração Regional) antes de publicar.',
  }
}
