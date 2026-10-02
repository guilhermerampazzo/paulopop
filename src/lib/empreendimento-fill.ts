/**
 * v1.5 — Preenchimento automático do imóvel a partir do empreendimento.
 *
 * Ao vincular um imóvel a um empreendimento (e, se houver, a uma unidade), tudo o que é
 * comum ao prédio — endereço, mapa, condomínio, andares, ano, textos e fotos — vem do
 * cadastro do empreendimento; a tipologia da unidade traz quartos, suítes, banheiros,
 * vagas, áreas e varandas. Fica para o corretor só o que é da unidade (preço, fotos do
 * apartamento, descrição própria…).
 *
 * Regra de ouro: NUNCA sobrescrever. Só campos vazios recebem valor.
 *  - Imóvel importado de portal: só completa o que falta. Fotos do prédio só entram se o
 *    imóvel não tiver nenhuma foto (a galeria importada não é mexida).
 *  - Imóvel cadastrado no painel: as fotos do prédio que ainda não estão na galeria são
 *    acrescentadas no fim (a capa continua sendo a do imóvel).
 *
 * Funções puras (sem banco) para poderem ser testadas; a rota
 * /api/admin/empreendimentos/[id]/preenchimento monta a entrada.
 */

export interface FillEmpreendimento {
  name: string
  tagline?: string | null
  description?: string | null
  address?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  latitude?: number | null
  longitude?: number | null
  locationDescription?: string | null
  floors?: number | null
  totalUnits?: number | null
  stage?: string | null
  deliveryYear?: number | null
  condoFeeAvg?: number | string | null
  lazerDescription?: string | null
  amenities?: string | null
  highlights?: string | null
  youtubeUrl?: string | null
  virtualTourUrl?: string | null
  virtualTourType?: string | null
  coverUrl?: string | null
  images?: { url: string; thumbnailUrl?: string | null; caption?: string | null; alt?: string | null; category?: string | null; order?: number | null }[]
}

export interface FillUnitType {
  name?: string | null
  bedrooms?: number | null
  suites?: number | null
  bathrooms?: number | null
  area?: number | string | null
  totalArea?: number | string | null
  parking?: number | null
  balconies?: number | null
  description?: string | null
  floorPlanUrl?: string | null
}

export interface FillUnit { floor?: number | null; number?: string | null }

export interface FillPhoto { url: string; thumbnailUrl: string | null; caption: string | null; alt: string | null }

export interface EmpreendimentoFill {
  /** valores candidatos, no formato do formulário do imóvel */
  fields: Record<string, string | number | boolean>
  extraFeatures: string[]
  photos: FillPhoto[]
  videoUrl: string | null
}

/** Rótulos dos campos, para o aviso "Preenchidos a partir do empreendimento". */
export const FILL_LABELS: Record<string, string> = {
  address: 'Endereço', neighborhood: 'Bairro', city: 'Cidade', state: 'UF', zipCode: 'CEP',
  latitude: 'Latitude', longitude: 'Longitude', showFullAddress: 'Mostrar endereço',
  buildingFloors: 'Andares do prédio', unitsInBuilding: 'Unidades no prédio', condominiumFee: 'Condomínio',
  constructionYear: 'Ano de construção', condition: 'Condição',
  bedrooms: 'Quartos', suites: 'Suítes', bathrooms: 'Banheiros', totalParkingSpots: 'Vagas',
  usefulArea: 'Área útil', totalArea: 'Área total', balconies: 'Varandas', floor: 'Andar',
  description: 'Descrição', surroundingsInfo: 'Localização e arredores',
  virtualTourUrl: 'Tour virtual', virtualTourType: 'Tipo do tour virtual',
  extraFeatures: 'Características', images: 'Fotos', videos: 'Vídeo',
}

const text = (v: unknown): string => {
  if (typeof v !== 'string') return ''
  return v
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Lista guardada como JSON (["Piscina", …]) ou texto (uma por linha / separada por vírgula). */
export function parseList(v: string | null | undefined): string[] {
  const raw = String(v ?? '').trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(x => String(x ?? '').trim()).filter(Boolean)
  } catch { /* texto comum */ }
  return raw.split(/\r?\n|;|,(?!\d)/).map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
}

const STAGE_CONDITION: Record<string, string> = { LANCAMENTO: 'Na planta', EM_OBRAS: 'Em construção' }
const PHOTO_ORDER: Record<string, number> = { FACHADA: 0, AREAS_COMUNS: 1, LAZER: 2, LOCALIZACAO: 3 }
const PHOTO_CAPTION: Record<string, string> = { FACHADA: 'Fachada', AREAS_COMUNS: 'Áreas comuns', LAZER: 'Lazer', LOCALIZACAO: 'Localização' }

/** Monta tudo o que o empreendimento (e a tipologia/unidade) pode oferecer ao imóvel. */
export function empreendimentoFill(emp: FillEmpreendimento, unitType?: FillUnitType | null, unit?: FillUnit | null): EmpreendimentoFill {
  const f: Record<string, string | number | boolean> = {}
  const put = (k: string, v: string | number | boolean | null | undefined) => {
    if (v === null || v === undefined) return
    if (typeof v === 'string' && !v.trim()) return
    f[k] = typeof v === 'string' ? v.trim() : v
  }

  // Localização (do prédio)
  put('address', emp.address)
  put('neighborhood', emp.neighborhood)
  put('city', emp.city)
  put('state', emp.state)
  put('zipCode', emp.zipCode)
  put('latitude', num(emp.latitude))
  put('longitude', num(emp.longitude))
  put('surroundingsInfo', text(emp.locationDescription))

  // Prédio
  put('buildingFloors', num(emp.floors))
  put('unitsInBuilding', num(emp.totalUnits))
  put('condominiumFee', num(emp.condoFeeAvg))
  if (emp.stage === 'ENTREGUE' || !emp.stage) put('constructionYear', num(emp.deliveryYear))
  if (emp.stage && STAGE_CONDITION[emp.stage]) put('condition', STAGE_CONDITION[emp.stage])
  if (emp.virtualTourUrl && emp.virtualTourType && emp.virtualTourType !== 'NONE') {
    put('virtualTourUrl', emp.virtualTourUrl)
    put('virtualTourType', emp.virtualTourType)
  }

  // Unidade e tipologia
  if (unit?.floor != null) put('floor', String(unit.floor))
  if (unitType) {
    put('bedrooms', num(unitType.bedrooms))
    put('suites', num(unitType.suites))
    put('bathrooms', num(unitType.bathrooms))
    put('totalParkingSpots', num(unitType.parking))
    put('usefulArea', num(unitType.area))
    put('totalArea', num(unitType.totalArea))
    put('balconies', num(unitType.balconies))
  }

  // Texto: a parte do empreendimento; a parte da unidade o corretor escreve acima
  const blocks: string[] = []
  const about = text(emp.description) || text(emp.tagline)
  if (about) blocks.push(`Sobre o ${emp.name}\n${about}`)
  if (unitType?.description && text(unitType.description)) blocks.push(`${unitType.name ? `Tipologia ${unitType.name}` : 'Tipologia'}\n${text(unitType.description)}`)
  const lazer = text(emp.lazerDescription)
  const amen = parseList(emp.amenities)
  if (lazer || amen.length) blocks.push(`Lazer e áreas comuns\n${[lazer, amen.length ? amen.map(a => `• ${a}`).join('\n') : ''].filter(Boolean).join('\n')}`)
  if (blocks.length) put('description', blocks.join('\n\n'))

  // Características: diferenciais + amenidades do prédio
  const extraFeatures = Array.from(new Set([...amen, ...parseList(emp.highlights)])).slice(0, 40)

  // Fotos do prédio: capa, fachada, áreas comuns, lazer, localização — e a planta da tipologia
  const photos: FillPhoto[] = []
  const seen = new Set<string>()
  const add = (url: string | null | undefined, thumb: string | null | undefined, caption: string | null, alt: string | null) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    photos.push({ url, thumbnailUrl: thumb ?? null, caption, alt })
  }
  add(emp.coverUrl, null, `${emp.name} — fachada`, emp.name)
  const imgs = [...(emp.images ?? [])].sort((a, b) =>
    (PHOTO_ORDER[a.category ?? ''] ?? 9) - (PHOTO_ORDER[b.category ?? ''] ?? 9) || (a.order ?? 0) - (b.order ?? 0))
  for (const i of imgs) add(i.url, i.thumbnailUrl, i.caption || `${emp.name} — ${PHOTO_CAPTION[i.category ?? ''] ?? 'empreendimento'}`, i.alt || emp.name)
  if (unitType?.floorPlanUrl) add(unitType.floorPlanUrl, null, `Planta${unitType.name ? ` — ${unitType.name}` : ''}`, `Planta ${unitType.name ?? ''}`.trim())

  return { fields: f, extraFeatures, photos: photos.slice(0, 40), videoUrl: emp.youtubeUrl?.trim() || null }
}

// ─── Aplicar no imóvel (sem sobrescrever) ──────────────────────────────────────

/** Contagens com 0 contam como vazias (o formulário começa com 0 quartos/banheiros/suítes). */
const ZERO_IS_EMPTY = new Set(['bedrooms', 'bathrooms', 'suites', 'totalParkingSpots', 'balconies', 'condominiumFee', 'usefulArea', 'totalArea', 'buildingFloors', 'unitsInBuilding'])

export function isEmptyValue(key: string, v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === '' || (ZERO_IS_EMPTY.has(key) && Number(v) === 0)
  if (typeof v === 'number') return ZERO_IS_EMPTY.has(key) && v === 0
  if (Array.isArray(v)) return v.filter(x => (typeof x === 'string' ? x.trim() : x)).length === 0
  return false
}

export interface ApplyResult {
  /** só os campos que mudam (todos estavam vazios) */
  patch: Record<string, unknown>
  /** rótulos do que foi preenchido, para o aviso */
  filled: string[]
  /** quantas fotos entraram */
  photosAdded: number
}

/**
 * Completa o imóvel (`current`, no formato do formulário) com o que veio do empreendimento.
 * `imported` = imóvel trazido de portal: fotos do prédio só se a galeria estiver vazia.
 */
export function applyEmpreendimentoFill(current: Record<string, unknown>, fill: EmpreendimentoFill, opts: { imported: boolean }): ApplyResult {
  const patch: Record<string, unknown> = {}
  const filled: string[] = []

  for (const [k, v] of Object.entries(fill.fields)) {
    if (!isEmptyValue(k, current[k])) continue
    // tipo do tour só junto com o endereço do tour
    if (k === 'virtualTourType' && !('virtualTourUrl' in patch) && !isEmptyValue('virtualTourUrl', current.virtualTourUrl)) continue
    if (k === 'virtualTourType' && current.virtualTourType && current.virtualTourType !== 'NONE') continue
    patch[k] = v
    if (FILL_LABELS[k] && k !== 'virtualTourType') filled.push(FILL_LABELS[k])
  }

  if (fill.extraFeatures.length && isEmptyValue('extraFeatures', current.extraFeatures)) {
    patch.extraFeatures = fill.extraFeatures
    filled.push(FILL_LABELS.extraFeatures)
  }

  const currentVideos = Array.isArray(current.videos) ? (current.videos as { youtubeUrl?: string }[]) : []
  if (fill.videoUrl && currentVideos.length === 0) {
    patch.videos = [{ youtubeUrl: fill.videoUrl, platform: 'youtube' }]
    filled.push(FILL_LABELS.videos)
  }

  const images = Array.isArray(current.images) ? (current.images as { url?: string }[]) : []
  let photosAdded = 0
  if (fill.photos.length && (!opts.imported || images.length === 0)) {
    const have = new Set(images.map(i => i.url).filter(Boolean))
    const toAdd = fill.photos.filter(p => !have.has(p.url))
    if (toAdd.length) {
      const startEmpty = images.length === 0
      patch.images = [
        ...images,
        ...toAdd.map((p, i) => ({ url: p.url, thumbnailUrl: p.thumbnailUrl, caption: p.caption, alt: p.alt, isCover: startEmpty && i === 0, is360: false, isPanoramic: false })),
      ]
      photosAdded = toAdd.length
      filled.push(`${FILL_LABELS.images} (${toAdd.length})`)
    }
  }

  return { patch, filled, photosAdded }
}

/** O imóvel veio de portal (importado)? */
export function isImportedProperty(p: Record<string, unknown>): boolean {
  return !!(p.importedAt || p.sourcePortal || p.sourceUrl || p.sourceId)
}
