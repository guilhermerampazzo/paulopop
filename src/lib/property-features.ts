/**
 * v1.3 — rótulos e agrupamento das características do imóvel
 * (Imóvel / Condomínio / Segurança / Lazer) a partir de `features`, `extraFeatures` e `lifestyles`.
 */

export const FEATURE_LABELS: Record<string, string> = {
  POOL: 'Piscina', GARDEN: 'Jardim', GARAGE: 'Garagem', JACUZZI: 'Jacuzzi',
  SOLAR_HEATING: 'Aquecimento solar', ACCEPTS_PETS: 'Aceita pets',
  INDIVIDUAL_GAS_METER: 'Gás individual', WHEELCHAIR_ACCESSIBLE: 'Acessível para cadeirantes',
  GOURMET_BALCONY: 'Varanda gourmet', BARBECUE: 'Churrasqueira', ELEVATOR: 'Elevador',
  GYM: 'Academia', PARTY_ROOM: 'Salão de festas', PLAYGROUND: 'Playground',
  SAUNA: 'Sauna', SECURITY_24H: 'Segurança 24h', INTERCOM: 'Interfone',
  ALARM: 'Alarme', GENERATOR: 'Gerador', FURNISHED: 'Mobiliado',
  SEMI_FURNISHED: 'Semimobiliado', AIR_CONDITIONING: 'Ar-condicionado',
  WOOD_FLOOR: 'Piso de madeira', CERAMIC_FLOOR: 'Piso cerâmico', MARBLE_FLOOR: 'Piso de mármore',
}

export const LIFESTYLE_LABELS: Record<string, string> = {
  RETIREMENT: 'Aposentadoria', WATER_SPRING: "Fonte d'água", BEACH: 'Beira-mar',
  GOLF: 'Golfe', INVESTMENT: 'Investimento', METROPOLIS: 'Metrópole',
  RANCH: 'Rancho e fazenda', SKI_RESORT: 'Ski e resort', HOT_CLIMATE: 'Clima quente',
  COUNTRYSIDE: 'Interior',
}

export type FeatureGroupName = 'Imóvel' | 'Condomínio' | 'Segurança' | 'Lazer'
export const FEATURE_GROUP_ORDER: FeatureGroupName[] = ['Imóvel', 'Condomínio', 'Segurança', 'Lazer']

const ENUM_GROUP: Record<string, FeatureGroupName> = {
  POOL: 'Lazer', GARDEN: 'Lazer', JACUZZI: 'Lazer', GOURMET_BALCONY: 'Imóvel', BARBECUE: 'Lazer',
  GYM: 'Lazer', PARTY_ROOM: 'Lazer', PLAYGROUND: 'Lazer', SAUNA: 'Lazer',
  SECURITY_24H: 'Segurança', INTERCOM: 'Segurança', ALARM: 'Segurança',
  GARAGE: 'Condomínio', ELEVATOR: 'Condomínio', GENERATOR: 'Condomínio', INDIVIDUAL_GAS_METER: 'Condomínio',
  WHEELCHAIR_ACCESSIBLE: 'Condomínio', ACCEPTS_PETS: 'Condomínio',
  SOLAR_HEATING: 'Imóvel', FURNISHED: 'Imóvel', SEMI_FURNISHED: 'Imóvel', AIR_CONDITIONING: 'Imóvel',
  WOOD_FLOOR: 'Imóvel', CERAMIC_FLOOR: 'Imóvel', MARBLE_FLOOR: 'Imóvel',
}

const TEXT_RULES: Array<{ group: FeatureGroupName; re: RegExp }> = [
  { group: 'Segurança', re: /seguran|portaria|porteiro|vigil|cerca|camera|câmera|monitor|alarme|guarita|blindad/i },
  { group: 'Lazer', re: /piscina|churras|academia|fitness|playground|sal[aã]o|quadra|sauna|brinquedo|gourmet|spa|cinema|lazer|jardim|pet ?place|coworking|bicicl|pomar|redario|redário|espaço|espaco|deck|solarium|solário|pergolado|fogueira/i },
  { group: 'Condomínio', re: /elevador|gerador|gás|gas\b|portão|portao|garagem|vaga|condom|zelador|lavanderia coletiva|acessib|síndico|sindico|bicicletário|estacionamento|visitante|coleta|interfone|hall/i },
]

export function classifyFeatureText(label: string): FeatureGroupName {
  for (const r of TEXT_RULES) if (r.re.test(label)) return r.group
  return 'Imóvel'
}

export interface FeatureGroup { name: FeatureGroupName; items: string[] }

export function groupFeatures(opts: { features: string[]; extraFeatures: string[]; lifestyles?: string[] }): FeatureGroup[] {
  const map = new Map<FeatureGroupName, string[]>()
  const add = (g: FeatureGroupName, label: string) => {
    const list = map.get(g) ?? []
    if (!list.includes(label)) list.push(label)
    map.set(g, list)
  }
  for (const f of opts.features) {
    const label = FEATURE_LABELS[f] ?? f
    add(ENUM_GROUP[f] ?? classifyFeatureText(label), label)
  }
  for (const raw of opts.extraFeatures) {
    const label = String(raw).trim()
    if (!label) continue
    add(classifyFeatureText(label), label)
  }
  for (const l of opts.lifestyles ?? []) add('Imóvel', LIFESTYLE_LABELS[l] ?? l)
  return FEATURE_GROUP_ORDER.filter(g => map.has(g)).map(g => ({ name: g, items: map.get(g)! }))
}
