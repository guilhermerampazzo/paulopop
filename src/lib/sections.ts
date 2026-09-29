/**
 * v1.3 — Editor de seções reutilizável (Cidades, Parceiros, Blog).
 * Uma página é uma lista ordenada de seções; cada seção é um bloco tipado salvo em JSON.
 * Tipos usados pelo editor do painel (SectionEditor) e pelo renderizador público (SectionRenderer).
 */

export type SectionType =
  | 'text'        // título + texto rico (HTML sanitizado)
  | 'gallery'     // galeria de imagens com legenda
  | 'video'       // YouTube / Shorts / upload
  | 'items'       // lista de itens (foto, título, texto, link, endereço)
  | 'timeline'    // linha do tempo (ano, título, texto, imagem)
  | 'people'      // pessoas (foto, nome, cargo, período, texto)
  | 'stats'       // números em destaque (rótulo, valor, fonte)
  | 'map'         // mapa (embed) com pinos/lista
  | 'properties'  // imóveis (automático por cidade/bairro ou seleção)
  | 'empreendimentos' // empreendimentos (automático por cidade ou seleção)
  | 'cta'         // chamada para ação (WhatsApp / formulário)
  | 'faq'         // perguntas frequentes
  | 'blog'        // posts do blog ligados à cidade/tag

export interface SectionBase {
  id: string
  type: SectionType
  title?: string
  subtitle?: string
  visible?: boolean // padrão true
  anchor?: string   // id para o índice lateral
}

export interface MediaImage { url: string; caption?: string; alt?: string }
export interface SectionText extends SectionBase { type: 'text'; html: string; imageUrl?: string; imagePosition?: 'left' | 'right' | 'top' }
export interface SectionGallery extends SectionBase { type: 'gallery'; images: MediaImage[]; layout?: 'grid' | 'carousel' | 'masonry' }
export interface SectionVideo extends SectionBase { type: 'video'; url: string; caption?: string; vertical?: boolean }
export interface ItemEntry { id: string; title: string; text?: string; imageUrl?: string; link?: string; address?: string; mapUrl?: string; phone?: string; badge?: string; videoUrl?: string; images?: MediaImage[] }
export interface SectionItems extends SectionBase { type: 'items'; items: ItemEntry[]; layout?: 'cards' | 'list'; columns?: 2 | 3 | 4 }
export interface TimelineEntry { id: string; year: string; title: string; text?: string; imageUrl?: string }
export interface SectionTimeline extends SectionBase { type: 'timeline'; entries: TimelineEntry[] }
export interface PersonEntry { id: string; name: string; role?: string; period?: string; text?: string; imageUrl?: string; link?: string }
export interface SectionPeople extends SectionBase { type: 'people'; people: PersonEntry[] }
export interface StatEntry { id: string; label: string; value: string; source?: string }
export interface SectionStats extends SectionBase { type: 'stats'; stats: StatEntry[] }
export interface MapPin { id: string; name: string; address?: string; lat?: number; lng?: number; category?: string }
export interface SectionMap extends SectionBase { type: 'map'; embedUrl?: string; pins: MapPin[]; text?: string }
export interface SectionProperties extends SectionBase { type: 'properties'; mode: 'auto' | 'manual'; transactionType?: 'SALE' | 'RENT' | 'ALL'; cityNames?: string[]; propertyIds?: string[]; limit?: number }
export interface SectionEmpreendimentos extends SectionBase { type: 'empreendimentos'; mode: 'auto' | 'manual'; cityNames?: string[]; empreendimentoIds?: string[]; limit?: number }
export interface SectionCta extends SectionBase { type: 'cta'; text?: string; buttonLabel?: string; whatsappMessage?: string; showForm?: boolean; style?: 'orange' | 'blue' | 'light' }
export interface FaqEntry { id: string; question: string; answer: string }
export interface SectionFaq extends SectionBase { type: 'faq'; entries: FaqEntry[] }
export interface SectionBlog extends SectionBase { type: 'blog'; citySlug?: string; tag?: string; limit?: number }

export type Section =
  | SectionText | SectionGallery | SectionVideo | SectionItems | SectionTimeline | SectionPeople
  | SectionStats | SectionMap | SectionProperties | SectionEmpreendimentos | SectionCta | SectionFaq | SectionBlog

export const SECTION_LABEL: Record<SectionType, string> = {
  text: 'Título e texto', gallery: 'Galeria de imagens', video: 'Vídeo', items: 'Lista de itens (foto, título, texto, endereço)',
  timeline: 'Linha do tempo', people: 'Pessoas (nome, cargo, foto)', stats: 'Números em destaque', map: 'Mapa com pontos',
  properties: 'Imóveis', empreendimentos: 'Empreendimentos', cta: 'Chamada para ação (WhatsApp / formulário)', faq: 'Perguntas frequentes', blog: 'Posts do blog',
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function emptySection(type: SectionType): Section {
  const base = { id: newId(), visible: true, title: '' }
  switch (type) {
    case 'text': return { ...base, type, html: '' }
    case 'gallery': return { ...base, type, images: [], layout: 'grid' }
    case 'video': return { ...base, type, url: '' }
    case 'items': return { ...base, type, items: [], layout: 'cards', columns: 3 }
    case 'timeline': return { ...base, type, entries: [] }
    case 'people': return { ...base, type, people: [] }
    case 'stats': return { ...base, type, stats: [] }
    case 'map': return { ...base, type, pins: [] }
    case 'properties': return { ...base, type, mode: 'auto', transactionType: 'ALL', limit: 8 }
    case 'empreendimentos': return { ...base, type, mode: 'auto', limit: 6 }
    case 'cta': return { ...base, type, title: 'Quer vender ou alugar seu imóvel?', text: 'Avaliação gratuita com quem conhece a região.', buttonLabel: 'Falar no WhatsApp', showForm: true, style: 'orange' }
    case 'faq': return { ...base, type, entries: [] }
    case 'blog': return { ...base, type, limit: 3 }
  }
}

/** Garante que o JSON vindo do banco/cliente é uma lista de seções válida (descarta lixo). */
export function parseSections(input: unknown): Section[] {
  if (!Array.isArray(input)) return []
  const out: Section[] = []
  for (const s of input) {
    if (!s || typeof s !== 'object') continue
    const t = (s as { type?: string }).type as SectionType
    if (!SECTION_LABEL[t]) continue
    const base = emptySection(t)
    out.push({ ...base, ...(s as object), type: t, id: String((s as { id?: string }).id || base.id) } as Section)
    if (out.length >= 60) break
  }
  return out
}

/** Modelo de página de cidade: seções pré-cadastradas na ordem pedida pelo Paulo. */
export function cityTemplate(cityName: string): Section[] {
  const mk = <T extends Section>(s: T, title: string, anchor: string): T => ({ ...s, title, anchor })
  return [
    mk(emptySection('text') as SectionText, `História de ${cityName}: como surgiu`, 'historia'),
    mk(emptySection('timeline') as SectionTimeline, 'Linha do tempo', 'linha-do-tempo'),
    mk(emptySection('people') as SectionPeople, 'Nomes importantes: governadores, administradores e deputados', 'nomes'),
    mk(emptySection('stats') as SectionStats, `${cityName} em números`, 'numeros'),
    mk(emptySection('items') as SectionItems, 'Locais para visitar', 'visitar'),
    { ...(emptySection('items') as SectionItems), title: 'Academias', anchor: 'academias', layout: 'list' },
    { ...(emptySection('items') as SectionItems), title: 'Escolas públicas e particulares', anchor: 'escolas', layout: 'list' },
    { ...(emptySection('items') as SectionItems), title: 'Supermercados e comércio', anchor: 'comercio', layout: 'list' },
    { ...(emptySection('items') as SectionItems), title: 'Ônibus, metrô e principais vias', anchor: 'transporte', layout: 'list' },
    mk(emptySection('map') as SectionMap, 'Mapa', 'mapa'),
    mk(emptySection('empreendimentos') as SectionEmpreendimentos, `Empreendimentos em ${cityName}`, 'empreendimentos'),
    mk(emptySection('properties') as SectionProperties, `Imóveis à venda e para alugar em ${cityName}`, 'imoveis'),
    { ...(emptySection('cta') as SectionCta), title: `Quer vender ou alugar seu imóvel em ${cityName}?`, anchor: 'vender' },
    mk(emptySection('blog') as SectionBlog, `Blog sobre ${cityName}`, 'blog'),
    mk(emptySection('faq') as SectionFaq, 'Perguntas frequentes', 'faq'),
  ]
}

export function partnerTemplate(name: string): Section[] {
  return [
    { ...(emptySection('text') as SectionText), title: `Sobre ${name}`, anchor: 'sobre' },
    { ...(emptySection('gallery') as SectionGallery), title: 'Fotos', anchor: 'fotos' },
    { ...(emptySection('items') as SectionItems), title: 'Serviços e condições para clientes do Paulo Pop', anchor: 'servicos', layout: 'list' },
    { ...(emptySection('cta') as SectionCta), title: 'Quer uma indicação?', text: 'Fale com o Paulo e receba o contato direto do parceiro.', anchor: 'contato', showForm: false },
  ]
}

/** Extrai texto puro das seções (para tempo de leitura e busca). */
export function sectionsPlainText(sections: Section[]): string {
  const strip = (h?: string) => (h ?? '').replace(/<[^>]+>/g, ' ')
  const parts: string[] = []
  for (const s of sections) {
    parts.push(s.title ?? '', s.subtitle ?? '')
    if (s.type === 'text') parts.push(strip(s.html))
    if (s.type === 'items') parts.push(...s.items.map(i => `${i.title} ${strip(i.text)}`))
    if (s.type === 'timeline') parts.push(...s.entries.map(i => `${i.year} ${i.title} ${strip(i.text)}`))
    if (s.type === 'people') parts.push(...s.people.map(i => `${i.name} ${i.role ?? ''} ${strip(i.text)}`))
    if (s.type === 'faq') parts.push(...s.entries.map(i => `${i.question} ${strip(i.answer)}`))
    if (s.type === 'cta') parts.push(strip(s.text))
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

export function readingMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
