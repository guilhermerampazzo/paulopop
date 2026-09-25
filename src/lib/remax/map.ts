/**
 * Conversão de um anúncio público da RE/MAX Brasil (remax.com.br) para o modelo
 * de imóvel do site. Funções puras (sem banco nem rede) para facilitar os testes.
 *
 * O site da RE/MAX é uma SPA: os dados vêm do índice de busca
 * POST /search/listing-search/docs/search  (campo "content" de cada documento)
 * e os rótulos em português vêm de /locales_v2/pt-BR/lookups.json (códigos UID)
 * e /locales_v2/pt-BR/translate.json (características "PropertyFeatures_*").
 */

export type RemaxListing = Record<string, unknown> & {
  MLSID?: string
  RegionId?: number
  AgentId?: number
  RepresentingAgentID?: number | null
  ListingImages?: { FileName: string; Order?: string | number; Name?: string }[]
  ListingFeatures?: { GroupingName?: string; FeatureName: string; FeatureID?: string }[]
  ListingDescriptions?: { Description: string; DescriptionTypeUID?: string; LanguageCode?: string }[]
  ShortLinks?: { ShortLink: string; LanguageCode?: string }[]
}

/** Rótulos: códigos UID → texto (lookups.json) e chaves de tradução → texto (translate.json). */
export interface RemaxLabels {
  lookups: Record<string, string>
  translations: Record<string, string>
}

export interface MappedImage { url: string; order: number; name?: string }

export interface MappedProperty {
  sourceId: string
  sourceUrl: string
  ref: string
  slugBase: string
  purpose: 'RESIDENTIAL' | 'COMMERCIAL'
  transactionType: 'SALE' | 'RENT'
  status: 'ACTIVE' | 'SOLD' | 'RENTED' | 'INACTIVE'
  contractType: 'EXCLUSIVE' | 'OPEN' | null
  propertyType: string | null
  marketStatus: string | null
  category: string | null
  landUse: string | null
  availabilityDate: Date | null
  expiryDate: Date | null
  constructionYear: number | null
  constructionMonth: number | null
  price: number | null
  condominiumFee: number | null
  condominiumFeePeriod: string | null
  iptu: number | null
  iptuPeriod: string | null
  totalArea: number | null
  usefulArea: number | null
  landArea: number | null
  floors: number | null
  environments: number | null
  bedrooms: number | null
  bathrooms: number | null
  suites: number | null
  totalParkingSpots: number | null
  zipCode: string | null
  address: string | null
  number: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  region: string | null
  latitude: number | null
  longitude: number | null
  showFullAddress: boolean
  title: string | null
  description: string | null
  features: string[]          // valores do enum FeatureType
  extraFeatures: string[]     // rótulos em português, na ordem da RE/MAX
  images: MappedImage[]
  videos: string[]
  virtualTourUrl: string | null
  agentIds: number[]          // representante primeiro, depois o captador
}

const CDN = 'https://cdn.gryphtech.com/userimages'

const UF: Record<string, string> = {
  'acre': 'AC', 'alagoas': 'AL', 'amapá': 'AP', 'amazonas': 'AM', 'bahia': 'BA', 'ceará': 'CE',
  'distrito federal': 'DF', 'espírito santo': 'ES', 'goiás': 'GO', 'maranhão': 'MA',
  'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG', 'pará': 'PA',
  'paraíba': 'PB', 'paraná': 'PR', 'pernambuco': 'PE', 'piauí': 'PI', 'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN', 'rio grande do sul': 'RS', 'rondônia': 'RO', 'roraima': 'RR',
  'santa catarina': 'SC', 'são paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO',
}

/** Características da RE/MAX (nome em inglês) que já existem como opção fixa no cadastro. */
const FEATURE_ENUM: Record<string, string> = {
  'Pets allowed': 'ACCEPTS_PETS',
  'Lift/Elevator': 'ELEVATOR',
  'Sauna': 'SAUNA',
  'Furnished': 'FURNISHED',
  'Split Air Conditioning': 'AIR_CONDITIONING',
  'Central Air': 'AIR_CONDITIONING',
  'Alarm System': 'ALARM',
  'Intercommunication Device with TV Monitor': 'INTERCOM',
  'Video Intercom': 'INTERCOM',
  'Voice Intercom': 'INTERCOM',
  'Private Swimming Pool': 'POOL',
  'Communal Pool': 'POOL',
  'Swimming Pool': 'POOL',
  'Landscaped Gardens': 'GARDEN',
  'Garden': 'GARDEN',
  'Jacuzzi': 'JACUZZI',
  'Solarhotwater': 'SOLAR_HEATING',
  'Built-In BBQ': 'BARBECUE',
  'BBQ Facilities': 'BARBECUE',
  'Fitness Club': 'GYM',
  "Children's Play Area (Outdoor)": 'PLAYGROUND',
  "Children's Play Area (Indoor)": 'PLAYGROUND',
  'Doorman': 'SECURITY_24H',
  'Tiled Flooring': 'CERAMIC_FLOOR',
  'Ceramic Tiles': 'CERAMIC_FLOOR',
  'Floors - Hardwood': 'WOOD_FLOOR',
  'Garage with Automatic Door': 'GARAGE',
  'Wheelchair Accessible': 'WHEELCHAIR_ACCESSIBLE',
}

const COMMERCIAL_RE = /comercial|loja|sala|galp|escrit|ponto|pr[eé]dio|industrial|hotel|pousada|restaurante|office|warehouse|shop/i

/** Extrai o ID do anúncio (ex.: 880221062-25) de um link da RE/MAX ou do próprio ID. */
export function parseRemaxId(input: string): string | null {
  const text = String(input ?? '').trim()
  if (!text) return null
  if (/^\d{6,12}-\d{1,6}$/.test(text)) return text
  let url: URL
  try { url = new URL(text) } catch { return null }
  if (!/(^|\.)remax\.com\.br$/i.test(url.hostname)) return null
  const m = url.pathname.match(/\/(\d{6,12}-\d{1,6})\/?$/)
  return m ? m[1] : null
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function int(v: unknown): number | null {
  const n = num(v)
  return n === null ? null : Math.round(n)
}

function positive(v: unknown): number | null {
  const n = num(v)
  return n !== null && n > 0 ? n : null
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s ? s : null
}

function label(labels: RemaxLabels, uid: unknown): string | null {
  const key = str(uid)
  if (!key) return null
  const t = labels.lookups[key]
  const clean = t ? t.trim() : ''
  return clean && clean !== '?' ? clean : null
}

function unixToDate(v: unknown): Date | null {
  const n = num(v)
  if (!n || n <= 0) return null
  const d = new Date(n * 1000)
  return Number.isNaN(d.getTime()) ? null : d
}

function textToDate(v: unknown): Date | null {
  const s = str(v)
  if (!s) return null
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Converte o HTML simples da descrição da RE/MAX em texto com quebras de linha. */
export function htmlToText(html: string): string {
  return html
    .replace(/\r/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function pick(listing: RemaxListing, pattern: RegExp): unknown {
  for (const [k, v] of Object.entries(listing)) {
    if (pattern.test(k) && v !== null && v !== undefined && v !== '') return v
  }
  return null
}

export function mapRemaxListing(listing: RemaxListing, labels: RemaxLabels): MappedProperty {
  const mlsid = str(listing.MLSID)
  if (!mlsid) throw new Error('Anúncio sem ID (MLSID).')

  const transactionUid = str(listing.TransactionTypeUID)
  const transactionType: 'SALE' | 'RENT' = transactionUid === '261' ? 'SALE' : transactionUid ? 'RENT' : 'SALE'

  const propertyType = label(labels, listing.PropertyTypeUID)
  const landUse = label(labels, listing.DesignatedLandUse)
  const purpose = COMMERCIAL_RE.test(`${propertyType ?? ''} ${landUse ?? ''}`) && !/residencial/i.test(landUse ?? '')
    ? 'COMMERCIAL' : 'RESIDENTIAL'

  const listingStatus = label(labels, listing.ListingStatusUID) ?? ''
  const status: MappedProperty['status'] =
    /vendido/i.test(listingStatus) ? 'SOLD'
      : /^alugado$/i.test(listingStatus) ? 'RENTED'
        : /cancelado|expirado/i.test(listingStatus) ? 'INACTIVE'
          : 'ACTIVE'

  const contractType = listing.ShowContractTypeExclusive === true ? 'EXCLUSIVE'
    : listing.ContractTypeUID ? 'OPEN' : null

  const monthLabel = label(labels, listing.MonthBuiltUID)
  const constructionMonth = monthLabel && /^\d{1,2}$/.test(monthLabel) ? Number(monthLabel) : null

  const province = str(listing.Province)
  const state = province ? (UF[province.toLowerCase()] ?? province) : null

  const coords = (listing.Location as { coordinates?: unknown[] } | null)?.coordinates
  const longitude = Array.isArray(coords) ? num(coords[0]) : null
  const latitude = Array.isArray(coords) ? num(coords[1]) : null

  const descriptions = (listing.ListingDescriptions ?? []).filter(d => !d.LanguageCode || d.LanguageCode === 'pt-BR')
  const titleEntry = descriptions.find(d => d.DescriptionTypeUID === '1113')
  const bodyEntry = descriptions.find(d => d.DescriptionTypeUID === '629')
    ?? descriptions.filter(d => d !== titleEntry).sort((a, b) => b.Description.length - a.Description.length)[0]
  const title = titleEntry ? htmlToText(titleEntry.Description).slice(0, 200) : null
  const description = bodyEntry ? htmlToText(bodyEntry.Description) : null

  const features = new Set<string>()
  const extraFeatures: string[] = []
  for (const f of listing.ListingFeatures ?? []) {
    const key = f.FeatureName
    const english = key.replace(/^PropertyFeatures_/, '')
    const enumValue = FEATURE_ENUM[english]
    if (enumValue) { features.add(enumValue); continue }
    const text = (labels.translations[key] ?? english).trim()
    if (text && !extraFeatures.includes(text)) extraFeatures.push(text)
  }

  const region = listing.RegionId
  const images = (listing.ListingImages ?? [])
    .filter(img => img && /^[\w.-]+\.(jpe?g|png|webp)$/i.test(img.FileName))
    .map((img, i) => ({
      url: `${CDN}/${region}/LargeWM/${img.FileName}`,
      order: int(img.Order) ?? i + 1,
      name: img.Name,
    }))
    .sort((a, b) => a.order - b.order)
    .slice(0, 60)

  const videos: string[] = []
  const videoValue = str(pick(listing, /^Video.*(Url|Link|URL)$/))
  if (videoValue && /youtu\.?be/i.test(videoValue)) videos.push(videoValue)
  const tour = str(pick(listing, /^VirtualTour.*(Url|Link|URL)$/))

  const shortLink = (listing.ShortLinks ?? []).find(l => l.LanguageCode === 'pt-BR')?.ShortLink
  const sourceUrl = shortLink ? `https://www.remax.com.br/${shortLink}` : `https://www.remax.com.br/pt-br/imoveis/${mlsid}`

  const neighborhood = str(listing.LocalZone)
  const city = str(listing.City)
  const typeSlug = propertyType ?? 'imovel'
  const slugBase = [typeSlug, transactionType === 'SALE' ? 'venda' : 'aluguel', neighborhood ?? city ?? '', mlsid]
    .filter(Boolean).join('-')

  const agentIds = [int(listing.RepresentingAgentID), int(listing.AgentId)]
    .filter((v): v is number => v !== null && v > 0)

  return {
    sourceId: `remax:${mlsid}`,
    sourceUrl,
    ref: mlsid,
    slugBase,
    purpose,
    transactionType,
    status,
    contractType,
    propertyType,
    marketStatus: label(labels, listing.MarketStatusUID),
    category: label(labels, listing.PropertyCategoryUID),
    landUse,
    availabilityDate: textToDate(listing.AvailabilityDate),
    expiryDate: unixToDate(listing.ExpiryDate),
    constructionYear: int(listing.YearBuilt),
    constructionMonth,
    price: positive(listing.ListingPrice),
    condominiumFee: positive(listing.MaintenanceFee),
    condominiumFeePeriod: label(labels, listing.MaintenanceFeeUID),
    iptu: positive(listing.PropertyTax),
    iptuPeriod: label(labels, listing.PropertyTaxPaymentPeriodUID),
    totalArea: positive(listing.TotalArea),
    usefulArea: positive(listing.LivingArea) ?? positive(listing.BuiltArea),
    landArea: positive(listing.LotSize) ?? positive(listing.LotSize2),
    floors: positive(listing.NumberOfFloors),
    environments: positive(listing.TotalNumOfRooms),
    bedrooms: int(listing.NumberOfBedrooms),
    bathrooms: int(listing.NumberOfBathrooms),
    suites: int(pick(listing, /^NumberOf(Suites|EnSuite)/i)),
    totalParkingSpots: int(pick(listing, /^(NumberOf)?Parking(Spaces|Spots)$/i)),
    zipCode: str(listing.PostalCode),
    address: str(listing.StreetName),
    number: str(listing.StreetNumber),
    neighborhood,
    city,
    state,
    region: str(listing.RegionalZone),
    latitude,
    longitude,
    showFullAddress: listing.ShowAddressPublic === true,
    title,
    description,
    features: Array.from(features),
    extraFeatures,
    images,
    videos,
    virtualTourUrl: tour,
    agentIds,
  }
}
