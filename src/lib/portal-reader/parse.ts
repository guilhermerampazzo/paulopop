/**
 * v1.4 — Leitor de anúncios dos portais (DF Imóveis, WImóveis, OLX, VivaReal, ZAP, Imovelweb, Chaves na Mão)
 * e de texto colado. Funções puras: recebem o HTML ou o texto e devolvem os campos que conseguiram identificar.
 *
 * Leitura de melhor esforço. Campo que o anúncio não traz fica vazio — nada é estimado.
 * Os portais mudam o HTML sem aviso: por isso a leitura combina metatags (og:*), JSON-LD, dados
 * embutidos (__NEXT_DATA__) e padrões de texto, e o corretor sempre confere antes de salvar.
 */
import { DF_CITY_SUGGESTIONS } from '@/lib/df-cities'
import { normalizeListingUrl, externalIdFromUrl } from '@/lib/intel/url-key'

export interface PortalInfo { slug: string; name: string; suffix: string }

export const PORTALS_ALLOWED: PortalInfo[] = [
  { slug: 'dfimoveis', name: 'DF Imóveis', suffix: 'dfimoveis.com.br' },
  { slug: 'wimoveis', name: 'WImóveis', suffix: 'wimoveis.com.br' },
  { slug: 'olx', name: 'OLX', suffix: 'olx.com.br' },
  { slug: 'vivareal', name: 'VivaReal', suffix: 'vivareal.com.br' },
  { slug: 'zap', name: 'ZAP', suffix: 'zapimoveis.com.br' },
  { slug: 'imovelweb', name: 'Imovelweb', suffix: 'imovelweb.com.br' },
  { slug: 'chavesnamao', name: 'Chaves na Mão', suffix: 'chavesnamao.com.br' },
  { slug: 'remax', name: 'RE/MAX', suffix: 'remax.com.br' },
]

export const PORTAL_HOST_SUFFIXES = PORTALS_ALLOWED.map(p => p.suffix)

export function portalOf(url: string | null | undefined): PortalInfo | null {
  if (!url) return null
  let host: string
  try { host = new URL(url).hostname.toLowerCase() } catch { return null }
  return PORTALS_ALLOWED.find(p => host === p.suffix || host.endsWith(`.${p.suffix}`)) ?? null
}

export interface ListingDraft {
  url: string | null
  portal: string | null        // nome do portal ("DF Imóveis")
  portalSlug: string | null    // "dfimoveis" | "colado"
  externalId: string | null
  title: string | null
  description: string | null
  propertyType: string | null
  transactionType: 'SALE' | 'RENT' | null
  price: number | null
  condoFee: number | null
  iptu: number | null
  usefulArea: number | null
  totalArea: number | null
  bedrooms: number | null
  suites: number | null
  bathrooms: number | null
  parking: number | null
  floor: string | null
  sunPosition: string | null
  renovation: string | null
  address: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  advertiser: string | null
  publishedAt: string | null   // AAAA-MM-DD
  photoUrls: string[]
  features: string[]
  /** campos que o leitor conseguiu preencher */
  filled: string[]
}

export const emptyDraft = (): ListingDraft => ({
  url: null, portal: null, portalSlug: null, externalId: null, title: null, description: null, propertyType: null, transactionType: null,
  price: null, condoFee: null, iptu: null, usefulArea: null, totalArea: null, bedrooms: null, suites: null, bathrooms: null, parking: null,
  floor: null, sunPosition: null, renovation: null, address: null, neighborhood: null, city: null, state: null, zipCode: null, advertiser: null,
  publishedAt: null, photoUrls: [], features: [], filled: [],
})

// ─── utilidades ───────────────────────────────────────────────────────────────

const cp = (n: number) => (Number.isInteger(n) && n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '')
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/&#(\d{1,7});/g, (_, d) => cp(Number(d))).replace(/&#x([0-9a-f]{1,6});/gi, (_, h) => cp(parseInt(h, 16)))

/** Limites de leitura: página de portal e texto colado maiores que isto são cortados antes de qualquer análise. */
export const MAX_HTML_CHARS = 1_500_000
export const MAX_TEXT_CHARS = 20_000

/** Remove blocos <tag>…</tag> em tempo linear (sem expressão regular que possa travar em página malformada). */
function dropBlocks(html: string, tag: string): string {
  const lower = html.toLowerCase()
  const open = `<${tag}`, close = `</${tag}`
  let out = '', pos = 0
  for (;;) {
    const a = lower.indexOf(open, pos)
    if (a < 0) { out += html.slice(pos); break }
    out += html.slice(pos, a) + ' '
    const b = lower.indexOf(close, a + open.length)
    if (b < 0) break                       // bloco sem fechamento: o resto é descartado
    const end = lower.indexOf('>', b)
    if (end < 0) break
    pos = end + 1
  }
  return out
}
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function htmlToText(html: string): string {
  const body = dropBlocks(dropBlocks(html.slice(0, MAX_HTML_CHARS), 'script'), 'style')
  return decode(body.replace(/<(br|\/p|\/div|\/li|\/h\d)\b[^<>]*>/gi, '\n').replace(/<[^<>]+>/g, ' '))
    .replace(/[ \t\r\f\v]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{2,}/g, '\n').trim()
}

/** "R$ 350.000,00" / "350.000" / "1.250,50" / "350000" → número. */
export function parseMoney(s: string | null | undefined): number | null {
  if (!s) return null
  const m = String(s).replace(/\s/g, '').match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/)
  if (!m) return null
  const v = Number(m[1].replace(/\./g, '') + (m[2] ? `.${m[2]}` : ''))
  return Number.isFinite(v) ? v : null
}

const numBR = (s: string) => { const v = Number(s.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')); return Number.isFinite(v) ? v : null }

function firstMatch(t: string, res: RegExp[]): string | null {
  for (const re of res) { const m = t.match(re); if (m?.[1]) return m[1] }
  return null
}

const TYPE_WORDS: Array<[RegExp, string]> = [
  [/casa (?:em|de) condominio/, 'Casa em Condomínio'], [/cobertura/, 'Cobertura'], [/kitnet|kitinete|quitinete|kit\b/, 'Kitnet'], [/studio|estudio/, 'Studio'], [/\bflat\b/, 'Flat'],
  [/apartamento|\bapto?\b|\bap\b/, 'Apartamento'], [/sobrado/, 'Sobrado'], [/\bcasa\b/, 'Casa'], [/\blote\b|terreno/, 'Terreno'], [/sala comercial|\bsala\b/, 'Sala Comercial'],
  [/\bloja\b/, 'Loja'], [/galpao/, 'Galpão'], [/chacara/, 'Chácara'], [/predio/, 'Prédio'],
]

export function guessType(text: string): string | null {
  const t = plain(text)
  for (const [re, label] of TYPE_WORDS) if (re.test(t)) return label
  return null
}

export function guessTransaction(text: string, url?: string | null): 'SALE' | 'RENT' | null {
  const t = plain(`${url ?? ''} ${text}`)
  const rent = /alug(a|uel|ar)|locacao|para alugar|\/aluguel\//.test(t)
  const sale = /\bvenda\b|a venda|vende-se|vendo\b|\/venda\//.test(t)
  if (rent && !sale) return 'RENT'
  if (sale) return 'SALE'
  return null
}

export function guessCity(text: string): string | null {
  const t = plain(text)
  // nomes mais longos primeiro ("Samambaia Sul" antes de "Samambaia" não existe na lista, mas "Lago Sul"/"Lago Norte" sim)
  const names = [...DF_CITY_SUGGESTIONS, 'Brasília', 'Asa Sul', 'Asa Norte', 'Noroeste', 'Sudoeste', 'Octogonal'].sort((a, b) => b.length - a.length)
  for (const name of names) {
    for (const part of name.split('/')) if (new RegExp(`\\b${plain(part).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t)) return part
  }
  return null
}

const ADDRESS_RE = /\b((?:QR|QN|QS|QI|QNL|QNM|QNN|QNO|QNP|QNJ|QNA|QNB|QNC|QND|QNE|QNF|QNG|QNH|QSA|QSB|QSC|QSD|QSE|QSF|CNB|CSB|CSA|CNA|QE|QL|SQS|SQN|SQSW|CLN|CLS|SHIS|SHIN|SMPW|ADE|Quadra|Qd\.?|Rua|Av\.?|Avenida)\s*\d{0,4}[^\n,;|]{0,60})/i

/** Extrai o que der de um texto corrido (anúncio colado ou texto da página). */
export function extractFromText(text: string): Partial<ListingDraft> {
  const t = text.replace(/ /g, ' ')
  const flat = t.replace(/\s+/g, ' ')
  const out: Partial<ListingDraft> = {}

  const condo = firstMatch(flat, [/condom[ií]nio[^R\d\n]{0,25}R?\$?\s?(\d[\d.]*(?:,\d{2})?)/i])
  const iptu = firstMatch(flat, [/IPTU[^R\d\n]{0,25}R?\$?\s?(\d[\d.]*(?:,\d{2})?)/i])
  out.condoFee = parseMoney(condo)
  out.iptu = parseMoney(iptu)
  // preço: "R$ …" que não seja condomínio nem IPTU; entre os restantes, o maior
  const prices: number[] = []
  const re = /R\$\s?(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d{3,9}(?:,\d{2})?)/g
  let m: RegExpExecArray | null
  let prevEnd = 0
  while ((m = re.exec(flat))) {
    // o rótulo que vale é o que está entre o valor anterior e este ("IPTU: R$ 3.400 Valor: R$ 890.000")
    const before = plain(flat.slice(Math.max(prevEnd, m.index - 30), m.index))
    prevEnd = m.index + m[0].length
    if (/condominio|iptu|taxa|entrada|parcela|sinal/.test(before)) continue
    const v = parseMoney(m[1])
    if (v != null && v >= 300) prices.push(v)
  }
  out.price = prices.length ? Math.max(...prices) : null

  const useful = firstMatch(flat, [
    /[áa]rea\s+(?:[úu]til|privativa)[^\d\n]{0,12}(\d{1,5}(?:[.,]\d{1,2})?)\s?m/i,
    /(\d{1,5}(?:[.,]\d{1,2})?)\s?m[²2]?\s+(?:de\s+[áa]rea\s+)?(?:[úu]t(?:il|eis)|privativ[oa]s?)/i,
  ])
  const total = firstMatch(flat, [/[áa]rea\s+total[^\d\n]{0,12}(\d{1,6}(?:[.,]\d{1,2})?)\s?m/i, /(\d{1,6}(?:[.,]\d{1,2})?)\s?m[²2]?\s+(?:de\s+[áa]rea\s+)?tota(?:l|is)/i])
  const generic = firstMatch(flat, [/(\d{2,5}(?:[.,]\d{1,2})?)\s?m[²2]/i, /(\d{2,5}(?:[.,]\d{1,2})?)\s?metros/i])
  out.usefulArea = useful ? numBR(useful) : !total && generic ? numBR(generic) : null
  out.totalArea = total ? numBR(total) : null

  const int = (res: RegExp[]) => { const v = firstMatch(flat, res); return v == null ? null : Number(v) }
  out.bedrooms = int([/(\d{1,2})\s?(?:quartos?|qtos?\b|dormit[óo]rios?|dorms?\b)/i, /quartos?[:\s]+(\d{1,2})\b/i])
  out.suites = int([/(\d{1,2})\s?su[íi]tes?/i, /su[íi]tes?[:\s]+(\d{1,2})\b/i]) ?? (/\bsu[íi]te\b/i.test(flat) ? 1 : null)
  out.bathrooms = int([/(\d{1,2})\s?(?:banheiros?|wc\b)/i, /banheiros?[:\s]+(\d{1,2})\b/i])
  out.parking = int([/(\d{1,2})\s?(?:vagas?|garagens?)/i, /(?:vagas?|garagens?)[:\s]+(\d{1,2})\b/i])

  const floor = firstMatch(flat, [/(\d{1,2})\s?[ºo°]\s?andar/i, /andar[:\s]+(\d{1,2})\b/i])
  out.floor = floor ?? (/\bt[ée]rreo\b/i.test(flat) ? 'Térreo' : null)
  out.sunPosition = /nascente/i.test(flat) ? 'Nascente' : /poente/i.test(flat) ? 'Poente' : null
  out.renovation = /reformad[oa]/i.test(flat) ? 'Reformado' : /planejad[oa]s?/i.test(flat) ? 'Com planejados' : null

  const dateM = flat.match(/(?:publicado|anunciado|criado|atualizado)\s?(?:em)?[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i)
  const daysM = flat.match(/(?:publicado|anunciado)\s?h[áa]\s?(\d{1,3})\s?dias?/i)
  out.publishedAt = dateM ? `${dateM[3]}-${dateM[2]}-${dateM[1]}` : daysM ? new Date(Date.now() - Number(daysM[1]) * 86_400_000).toISOString().slice(0, 10) : null

  const zip = flat.match(/\b(\d{5})-?(\d{3})\b/)
  out.zipCode = zip && /cep/i.test(flat.slice(Math.max(0, (zip.index ?? 0) - 12), zip.index ?? 0)) ? `${zip[1]}-${zip[2]}` : null
  out.address = t.match(ADDRESS_RE)?.[1]?.replace(/\s+/g, ' ').trim().replace(/[\s.\-–]+$/, '') ?? null
  out.city = guessCity(flat)
  if (out.city) out.state = 'DF'
  out.propertyType = guessType(flat)
  return out
}

// ─── HTML dos portais ─────────────────────────────────────────────────────────

function meta(full: string, prop: string): string | null {
  const html = full.slice(0, 300_000) // as metatags ficam no começo da página
  const p = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']*)["']`, 'i'))
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${p}["']`, 'i'))
  const v = a?.[1] ?? b?.[1] ?? null
  return v ? decode(v).trim() || null : null
}

function jsonBlocks(html: string): unknown[] {
  const out: unknown[] = []
  const lower = html.toLowerCase()
  let pos = 0
  for (let i = 0; i < 60; i++) {
    const a = lower.indexOf('<script', pos)
    if (a < 0) break
    const tagEnd = lower.indexOf('>', a)
    if (tagEnd < 0) break
    const b = lower.indexOf('</script', tagEnd)
    if (b < 0) break
    pos = b + 8
    const attrs = lower.slice(a, tagEnd)
    if (!attrs.includes('application/ld+json') && !attrs.includes('__next_data__')) { i--; continue }
    const body = html.slice(tagEnd + 1, b).trim()
    if (body.length > 1_200_000) continue
    try { out.push(JSON.parse(body)) } catch { /* JSON inválido: ignora */ }
  }
  return out
}

/** Percorre o JSON embutido e guarda o primeiro valor útil de cada chave conhecida. */
function walk(node: unknown, found: Record<string, unknown>, photos: string[], depth = 0): void {
  if (node == null || depth > 14) return
  if (Array.isArray(node)) { for (const x of node.slice(0, 400)) walk(x, found, photos, depth + 1); return }
  if (typeof node !== 'object') return
  const o = node as Record<string, unknown>
  for (const [k, v] of Object.entries(o)) {
    const key = k.toLowerCase()
    const scalar = typeof v === 'string' || typeof v === 'number'
    const set = (name: string, val: unknown) => { if (found[name] === undefined && val !== '' && val != null) found[name] = val }
    if (scalar) {
      if (key === 'price' || key === 'pricevalue' || key === 'lowprice' || key === 'saleprice') set('price', v)
      else if (key === 'condofee' || key === 'monthlycondofee' || key === 'condominio') set('condoFee', v)
      else if (key === 'iptu' || key === 'yearlyiptu') set('iptu', v)
      else if (key === 'usableareas' || key === 'usablearea' || key === 'areautil' || key === 'floorsize' || key === 'size') set('usefulArea', v)
      else if (key === 'totalareas' || key === 'totalarea' || key === 'areatotal') set('totalArea', v)
      else if (key === 'bedrooms' || key === 'numberofbedrooms' || key === 'numberofrooms' || key === 'rooms' || key === 'quartos') set('bedrooms', v)
      else if (key === 'suites') set('suites', v)
      else if (key === 'bathrooms' || key === 'numberofbathroomstotal' || key === 'banheiros') set('bathrooms', v)
      else if (key === 'parkingspaces' || key === 'garagespaces' || key === 'garage_spaces' || key === 'vagas') set('parking', v)
      else if (key === 'streetaddress' || key === 'street') set('address', v)
      else if (key === 'neighborhood' || key === 'bairro') set('neighborhood', v)
      else if (key === 'addresslocality' || key === 'city' || key === 'municipality' || key === 'cidade') set('city', v)
      else if (key === 'addressregion' || key === 'stateacronym' || key === 'uf') set('state', v)
      else if (key === 'postalcode' || key === 'zipcode' || key === 'cep') set('zipCode', v)
      else if (key === 'datepublished' || key === 'dateposted' || key === 'createdat' || key === 'listdate' || key === 'listtime') set('publishedAt', v)
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      const vo = v as Record<string, unknown>
      if (key === 'floorsize' && (typeof vo.value === 'number' || typeof vo.value === 'string')) set('usefulArea', vo.value)
      if ((key === 'advertiser' || key === 'seller' || key === 'publisher' || key === 'account') && typeof vo.name === 'string') set('advertiser', vo.name)
    } else if (Array.isArray(v)) {
      // VivaReal/ZAP guardam números como listas de um item: usableAreas: ["60"]
      const first = v[0]
      if ((typeof first === 'string' || typeof first === 'number') && ['usableareas', 'totalareas', 'bedrooms', 'bathrooms', 'suites', 'parkingspaces'].includes(key)) {
        const name = key === 'usableareas' ? 'usefulArea' : key === 'totalareas' ? 'totalArea' : key === 'parkingspaces' ? 'parking' : key
        set(name, first)
      }
    }
    if (key === 'image' || key === 'images' || key === 'photos' || key === 'medias' || key === 'pictures') {
      for (const x of (Array.isArray(v) ? v : [v]).slice(0, 60)) {
        const u = typeof x === 'string' ? x : x && typeof x === 'object' ? ((x as Record<string, unknown>).original ?? (x as Record<string, unknown>).url ?? (x as Record<string, unknown>).contentUrl ?? (x as Record<string, unknown>).src) : null
        if (typeof u === 'string') photos.push(u)
      }
    }
    // OLX: properties: [{ name: 'size', label: 'Área útil', value: '60m²' }, …]
    if (key === 'properties' && Array.isArray(v)) {
      for (const p of v.slice(0, 80)) {
        if (!p || typeof p !== 'object') continue
        const po = p as Record<string, unknown>
        const label = plain(String(po.label ?? po.name ?? ''))
        const val = po.value
        if (typeof val !== 'string' && typeof val !== 'number') continue
        if (/area util|^size$/.test(label)) set('usefulArea', val)
        else if (/area total|area construida/.test(label)) set('totalArea', val)
        else if (/quartos|^rooms$/.test(label)) set('bedrooms', val)
        else if (/banheiros|^bathrooms$/.test(label)) set('bathrooms', val)
        else if (/vagas|garage/.test(label)) set('parking', val)
        else if (/condominio|^condominio$/.test(label)) set('condoFee', val)
        else if (/iptu/.test(label)) set('iptu', val)
      }
    }
    if (v && typeof v === 'object') walk(v, found, photos, depth + 1)
  }
}

const toNum = (v: unknown, min: number, max: number): number | null => {
  if (v == null) return null
  const n = typeof v === 'number' ? v : (/[.,]\d{3}\b|,/.test(String(v)) ? parseMoney(String(v)) : Number(String(v).replace(/[^\d.]/g, '')))
  return n != null && Number.isFinite(n) && n >= min && n <= max ? n : null
}
const toInt = (v: unknown, max: number) => { const n = toNum(v, 0, max); return n == null ? null : Math.round(n) }
const toStr = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? decode(v).replace(/\s+/g, ' ').trim().slice(0, max) : null)
const toDate = (v: unknown): string | null => {
  if (typeof v === 'number' && v > 1e9) { const d = new Date(v < 1e12 ? v * 1000 : v); return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10) }
  if (typeof v !== 'string') return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) || d.getTime() > Date.now() + 86_400_000 ? null : d.toISOString().slice(0, 10)
}

export function cleanPhotoUrls(urls: string[], base?: string | null): string[] {
  const out: string[] = []
  for (const raw of urls) {
    let u: URL
    try { u = new URL(decode(String(raw)).trim(), base ?? undefined) } catch { continue }
    if (u.protocol !== 'https:') continue
    if (/\.(svg|gif)(\?|$)/i.test(u.pathname) || /logo|sprite|avatar|icon|placeholder/i.test(u.pathname)) continue
    const s = u.toString()
    if (s.length <= 1000 && !out.includes(s)) out.push(s)
    if (out.length >= 30) break
  }
  return out
}

function finish(d: ListingDraft): ListingDraft {
  const keys: Array<keyof ListingDraft> = ['title', 'description', 'propertyType', 'transactionType', 'price', 'condoFee', 'iptu', 'usefulArea', 'totalArea', 'bedrooms', 'suites', 'bathrooms', 'parking', 'floor', 'address', 'neighborhood', 'city', 'zipCode', 'advertiser', 'publishedAt']
  d.filled = keys.filter(k => d[k] !== null && d[k] !== undefined && d[k] !== '') as string[]
  if (d.photoUrls.length) d.filled.push('photoUrls')
  return d
}

/** Lê o HTML de um anúncio de portal. */
export function parseListingHtml(rawHtml: string, url: string): ListingDraft {
  const html = rawHtml.slice(0, MAX_HTML_CHARS)
  const d = emptyDraft()
  const norm = normalizeListingUrl(url)
  const portal = portalOf(url)
  d.url = norm?.url ?? url
  d.portal = portal?.name ?? null
  d.portalSlug = portal?.slug ?? null
  d.externalId = externalIdFromUrl(url)

  const found: Record<string, unknown> = {}
  const photos: string[] = []
  for (const block of jsonBlocks(html)) walk(block, found, photos)

  const title = meta(html, 'og:title') ?? toStr(html.slice(0, 300_000).match(/<title[^<>]*>([^<]*)<\/title>/i)?.[1], 300)
  const description = meta(html, 'og:description') ?? meta(html, 'description')
  const text = htmlToText(html)
  const fromText = extractFromText(`${title ?? ''}\n${description ?? ''}\n${text}`)
  // os números do topo do anúncio (título + descrição) valem mais que o texto solto da página
  const fromHead = extractFromText(`${title ?? ''}\n${description ?? ''}`)

  d.title = toStr(title, 200)
  d.description = toStr(description, 5000)
  d.price = toNum(found.price, 300, 500_000_000) ?? parseMoney(meta(html, 'product:price:amount')) ?? fromHead.price ?? fromText.price ?? null
  d.condoFee = toNum(found.condoFee, 1, 100_000) ?? fromText.condoFee ?? null
  d.iptu = toNum(found.iptu, 1, 1_000_000) ?? fromText.iptu ?? null
  d.usefulArea = toNum(found.usefulArea, 8, 100_000) ?? fromHead.usefulArea ?? fromText.usefulArea ?? null
  d.totalArea = toNum(found.totalArea, 8, 1_000_000) ?? fromHead.totalArea ?? fromText.totalArea ?? null
  d.bedrooms = toInt(found.bedrooms, 30) ?? fromHead.bedrooms ?? fromText.bedrooms ?? null
  d.suites = toInt(found.suites, 30) ?? fromHead.suites ?? fromText.suites ?? null
  d.bathrooms = toInt(found.bathrooms, 30) ?? fromHead.bathrooms ?? fromText.bathrooms ?? null
  d.parking = toInt(found.parking, 50) ?? fromHead.parking ?? fromText.parking ?? null
  d.floor = fromHead.floor ?? fromText.floor ?? null
  d.sunPosition = fromText.sunPosition ?? null
  d.renovation = fromText.renovation ?? null
  d.address = toStr(found.address, 200) ?? fromHead.address ?? fromText.address ?? null
  d.neighborhood = toStr(found.neighborhood, 80)
  d.city = toStr(found.city, 80) ?? fromHead.city ?? guessCity(`${url} ${title ?? ''}`) ?? fromText.city ?? null
  d.state = toStr(found.state, 2)?.toUpperCase() ?? (d.city ? 'DF' : null)
  d.zipCode = toStr(found.zipCode, 9) ?? fromText.zipCode ?? null
  d.advertiser = toStr(found.advertiser, 200)
  d.publishedAt = toDate(found.publishedAt) ?? fromText.publishedAt ?? null
  d.propertyType = guessType(`${title ?? ''} ${url}`) ?? fromText.propertyType ?? null
  d.transactionType = guessTransaction(title ?? '', url) ?? guessTransaction(description ?? '')
  const og = meta(html, 'og:image')
  d.photoUrls = cleanPhotoUrls([...(og ? [og] : []), ...photos], url)
  return finish(d)
}

/** Lê um anúncio colado como texto (copiar e colar do portal, do WhatsApp ou de uma ficha). */
export function parseListingText(raw: string, url?: string | null): ListingDraft {
  const d = emptyDraft()
  const text = String(raw ?? '').slice(0, MAX_TEXT_CHARS).replace(/\r/g, '').replace(/<[^<>]*>/g, ' ')
  const linkInText = text.match(/https:\/\/[^\s"'<>)]+/)?.[0] ?? null
  const link = url && /^https:\/\//i.test(url) ? url : linkInText
  const norm = link ? normalizeListingUrl(link) : null
  const portal = portalOf(link)
  d.url = norm?.url ?? null
  d.portal = portal?.name ?? (link ? null : null)
  d.portalSlug = portal?.slug ?? 'colado'
  d.externalId = link ? externalIdFromUrl(link) : null
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const t = extractFromText(text)
  Object.assign(d, Object.fromEntries(Object.entries(t).filter(([, v]) => v !== undefined)))
  d.title = lines.find(l => l.length >= 8 && l.length <= 140 && !/^https?:/i.test(l) && !/^R\$/.test(l))?.slice(0, 200) ?? null
  d.description = lines.filter(l => !/^https?:/i.test(l)).join('\n').slice(0, 5000) || null
  d.transactionType = guessTransaction(text, link)
  d.photoUrls = []
  return finish(d)
}
