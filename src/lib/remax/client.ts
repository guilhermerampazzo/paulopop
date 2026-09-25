import type { RemaxLabels, RemaxListing } from './map'

const BASE = 'https://www.remax.com.br'
const HEADERS: Record<string, string> = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'pt-BR,pt;q=0.9',
  'content-type': 'application/json',
  'origin': BASE,
  'referer': `${BASE}/pt-br`,
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
}

export class RemaxFetchError extends Error {
  constructor(message: string, public readonly blocked = false) { super(message) }
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(20000) })
  } catch (e) {
    throw new RemaxFetchError(`Não foi possível acessar a RE/MAX (${(e as Error).message}).`, true)
  }
  const text = await res.text()
  if (!res.ok) throw new RemaxFetchError(`A RE/MAX respondeu ${res.status}.`, res.status === 403 || res.status === 429 || res.status === 503)
  try { return JSON.parse(text) } catch {
    throw new RemaxFetchError('A RE/MAX devolveu uma página em vez dos dados (proteção anti-robô).', true)
  }
}

function parseContent(v: { content?: unknown }): Record<string, unknown> | null {
  const c = v?.content
  if (!c) return null
  if (typeof c === 'string') { try { return JSON.parse(c) } catch { return null } }
  return c as Record<string, unknown>
}

async function search(index: 'listing-search' | 'agent-search', term: string) {
  const data = await request(`/search/${index}/docs/search`, {
    method: 'POST',
    body: JSON.stringify({ search: `"${term}"`, top: 10 }),
  }) as { value?: { content?: unknown }[] }
  return (data.value ?? []).map(parseContent).filter((c): c is Record<string, unknown> => !!c)
}

export async function fetchRemaxListing(mlsid: string): Promise<RemaxListing> {
  const docs = await search('listing-search', mlsid)
  const hit = docs.find(d => d.MLSID === mlsid)
  if (!hit) throw new RemaxFetchError(`Anúncio ${mlsid} não encontrado na RE/MAX (pode ter saído do ar).`)
  return hit as RemaxListing
}

let labelsCache: { at: number; value: RemaxLabels } | null = null

export async function fetchRemaxLabels(): Promise<RemaxLabels> {
  if (labelsCache && Date.now() - labelsCache.at < 24 * 3600 * 1000) return labelsCache.value
  const [lookupsRaw, translations] = await Promise.all([
    request('/locales_v2/pt-BR/lookups.json') as Promise<{ ItemName: string; Translation: string }[]>,
    request('/locales_v2/pt-BR/translate.json') as Promise<Record<string, string>>,
  ])
  const lookups: Record<string, string> = {}
  for (const item of Array.isArray(lookupsRaw) ? lookupsRaw : []) lookups[String(item.ItemName)] = String(item.Translation)
  const value = { lookups, translations: translations ?? {} }
  labelsCache = { at: Date.now(), value }
  return value
}

export interface RemaxAgentInfo { agentName: string | null; officeName: string | null }

/** Nome do corretor e da imobiliária do anúncio (o primeiro ID encontrado). */
export async function fetchRemaxAgent(agentIds: number[]): Promise<RemaxAgentInfo> {
  for (const id of agentIds) {
    try {
      const docs = await search('agent-search', String(id))
      const hit = docs.find(d => Number(d.AgentId) === id)
      if (hit) return { agentName: (hit.AgentName as string) ?? null, officeName: (hit.OfficeName as string) ?? null }
    } catch { /* segue sem o nome */ }
  }
  return { agentName: null, officeName: null }
}

/** Baixa uma foto do CDN da RE/MAX (Gryphtech). */
export async function downloadRemaxImage(url: string): Promise<Buffer> {
  if (!/^https:\/\/cdn\.gryphtech\.com\/userimages\//.test(url)) throw new Error('Origem de imagem não permitida.')
  const res = await fetch(url, { headers: { 'user-agent': HEADERS['user-agent'], referer: `${BASE}/` }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`Foto indisponível (${res.status}).`)
  const type = res.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) throw new Error('O arquivo baixado não é uma imagem.')
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > 15 * 1024 * 1024) throw new Error('Foto grande demais.')
  return buf
}
