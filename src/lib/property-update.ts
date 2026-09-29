import { sanitizeHtml } from '@/lib/sanitize'

const RELATION_FIELDS = [
  'images',
  'videos',
  'documents',
  'features',
  'lifestyles',
  'parkingSpots',
  'rooms',
  'additionalFees',
  'portals',
  'leads',
  'activities',
  'agent',
  'condominium',
  'empreendimento',
  'owner',
] as const

const NULLABLE_DATE_FIELDS = ['expiryDate', 'availabilityDate', 'publishedAt', 'soldAt'] as const
const NULLABLE_INT_FIELDS = [
  'constructionYear',
  'constructionMonth',
  'floors',
  'unitsInBuilding',
  'maxOccupancy',
  'totalParkingSpots',
  'buildingFloors',
  'environments',
  'bedrooms',
  'bathrooms',
  'suites',
  'balconies',
  'daysOnMarket',
] as const
const NULLABLE_DECIMAL_FIELDS = [
  'price',
  'pricePerSqm',
  'iptu',
  'condominiumFee',
  'captureCommissionPct',
  'captureCommissionAmt',
  'saleCommissionPct',
  'saleCommissionAmt',
  'listPriceAtSale',
  'salePrice',
  'saleDiscountPct',
  'saleDiscountValue',
  'totalArea',
  'usefulArea',
  'landArea',
  'cubicVolume',
  'landDimensionWidth',
  'landDimensionLength',
  'latitude',
  'longitude',
] as const
const NULLABLE_ENUM_FIELDS = ['contractType', 'priceType'] as const
const NULLABLE_FK_FIELDS = ['condominiumId', 'empreendimentoId', 'ownerId', 'secondaryAgentId', 'unitId'] as const
const IMMUTABLE_FIELDS = [
  'createdAt', 'updatedAt', 'id', 'ref', 'slug', 'views', 'favorites',
  // origem da importação: só o importador grava
  'sourcePortal', 'sourceId', 'sourceUrl', 'sourceAgentName', 'sourceOfficeName', 'importedAt',
  // v1.1: senha do relatório só pela rota do relatório
  'reportPasswordHash', 'reportPasswordSetAt',
] as const

function parseDate(value: unknown): string | null {
  if (value === '' || value === null || value === undefined) return null
  if (typeof value !== 'string') return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function parseNullableInt(value: unknown): number | null | unknown {
  if (value === '' || value === null || value === undefined) return null
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return value

  const normalized = value.trim()
  if (!normalized) return null

  const parsed = Number.parseInt(normalized, 10)
  return Number.isNaN(parsed) ? value : parsed
}

function parseNullableDecimal(value: unknown): number | null | unknown {
  if (value === '' || value === null || value === undefined) return null
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return value

  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null

  const parsed = Number.parseFloat(normalized)
  return Number.isNaN(parsed) ? null : parsed
}

export function normalizePropertyUpdateInput(body: Record<string, unknown>) {
  const data = { ...body }

  for (const field of RELATION_FIELDS) {
    delete data[field]
  }

  if (typeof data.description === 'string') data.description = sanitizeHtml(data.description)
  if (typeof data.marketingDescription === 'string') data.marketingDescription = sanitizeHtml(data.marketingDescription)
  if (typeof data.surroundingsInfo === 'string') data.surroundingsInfo = sanitizeHtml(data.surroundingsInfo)
  if (typeof data.descriptionEn === 'string') data.descriptionEn = sanitizeHtml(data.descriptionEn)

  for (const field of NULLABLE_DATE_FIELDS) {
    data[field] = parseDate(data[field])
  }

  if ('registrationDate' in data) {
    const parsed = parseDate(data.registrationDate)
    if (parsed) data.registrationDate = parsed
    else delete data.registrationDate
  }

  for (const field of NULLABLE_INT_FIELDS) {
    data[field] = parseNullableInt(data[field])
  }

  for (const field of NULLABLE_DECIMAL_FIELDS) {
    data[field] = parseNullableDecimal(data[field])
  }

  for (const field of NULLABLE_ENUM_FIELDS) {
    if (data[field] === '') data[field] = null
  }

  for (const field of NULLABLE_FK_FIELDS) {
    if (field in data) {
      data[field] = data[field] === '' || data[field] === undefined ? null : data[field]
    }
  }

  if ('extraFeatures' in data) {
    const raw = data.extraFeatures
    const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split('\n') : []
    data.extraFeatures = Array.from(new Set(
      list.map(v => String(v).trim()).filter(v => v.length > 0 && v.length <= 80),
    )).slice(0, 100)
  }

  if (data.status === 'ACTIVE' && !data.publishedAt) {
    data.publishedAt = new Date().toISOString()
  }

  for (const field of IMMUTABLE_FIELDS) {
    delete data[field]
  }

  return data
}
