/**
 * v1.3 — agrupa fotos do imóvel por cômodo a partir da legenda (caption/alt).
 * Grupos: Fachada/Área comum, Sala, Cozinha, Quartos/Suíte, Banheiros, Varanda, Lazer, Plantas, Outros.
 * Sem legenda → "Fotos". Também usada para separar as plantas (legenda com "planta").
 */

export interface GalleryPhoto {
  url: string
  thumbnailUrl?: string | null
  alt?: string | null
  caption?: string | null
}

export const GALLERY_GROUP_ORDER = [
  'Fachada / Área comum', 'Sala', 'Cozinha', 'Quartos / Suíte', 'Banheiros', 'Varanda', 'Lazer', 'Plantas', 'Outros', 'Fotos',
] as const
export type GalleryGroupName = (typeof GALLERY_GROUP_ORDER)[number]

const RULES: Array<{ group: GalleryGroupName; re: RegExp }> = [
  { group: 'Plantas', re: /\bplanta|floor ?plan|layout\b/ },
  { group: 'Fachada / Área comum', re: /fachada|frente|entrada|hall|portaria|area comum|área comum|condominio|condomínio|garagem|vaga|predio|prédio|externa|vista/ },
  { group: 'Lazer', re: /lazer|piscina|churrasq|salao|salão|academia|playground|quadra|sauna|gourmet(?!.*varanda)|espaco|espaço|festa|jardim|deck/ },
  { group: 'Cozinha', re: /cozinha|copa|lavanderia|area de servico|área de serviço|servico|serviço/ },
  { group: 'Banheiros', re: /banheiro|lavabo|wc|toalete|toilette|banho/ },
  { group: 'Quartos / Suíte', re: /quarto|suite|suíte|dormit|closet/ },
  { group: 'Varanda', re: /varanda|sacada|terraco|terraço/ },
  { group: 'Sala', re: /sala|living|estar|jantar|home ?office|escritorio|escritório/ },
]

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Legenda "genérica" (ex.: "Título do imóvel - imagem 3") não define cômodo. */
export function classifyPhoto(photo: GalleryPhoto): GalleryGroupName {
  const text = normalize(`${photo.caption ?? ''} ${photo.alt ?? ''}`.trim())
  if (!text) return 'Fotos'
  for (const r of RULES) if (r.re.test(text)) return r.group
  return 'Outros'
}

export interface GalleryGroup { name: GalleryGroupName; photos: Array<GalleryPhoto & { index: number }> }

/**
 * Agrupa mantendo a ordem original dentro de cada grupo. Se todas as fotos caírem em
 * "Fotos"/"Outros", devolve um único grupo "Fotos" (sem sub-abas inúteis).
 */
export function groupPhotos(photos: GalleryPhoto[]): GalleryGroup[] {
  const map = new Map<GalleryGroupName, GalleryGroup>()
  photos.forEach((p, index) => {
    const name = classifyPhoto(p)
    if (!map.has(name)) map.set(name, { name, photos: [] })
    map.get(name)!.photos.push({ ...p, index })
  })
  const groups = GALLERY_GROUP_ORDER.filter(n => map.has(n)).map(n => map.get(n)!)
  const meaningful = groups.filter(g => g.name !== 'Fotos' && g.name !== 'Outros' && g.name !== 'Plantas')
  if (!meaningful.length) {
    const rest = photos.map((p, index) => ({ ...p, index })).filter(p => classifyPhoto(p) !== 'Plantas')
    return rest.length ? [{ name: 'Fotos', photos: rest }] : []
  }
  return groups.filter(g => g.name !== 'Plantas')
}

/** Fotos cuja legenda indica planta (usadas na aba "Plantas"). */
export function floorPlanPhotos(photos: GalleryPhoto[]): Array<GalleryPhoto & { index: number }> {
  return photos.map((p, index) => ({ ...p, index })).filter(p => classifyPhoto(p) === 'Plantas')
}
