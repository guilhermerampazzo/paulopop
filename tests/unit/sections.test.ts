import { describe, it, expect } from 'vitest'
import { parseSections, cityTemplate, partnerTemplate, sectionsPlainText, readingMinutes, emptySection, SECTION_LABEL, type Section } from '@/lib/sections'
import { sanitizeSections } from '@/lib/sections-sanitize'
import { youtubeEmbedUrl, mapsSearchUrl } from '@/lib/section-data'

describe('v1.3 — parseSections', () => {
  it('descarta lixo e mantém os ids', () => {
    const input = [
      { id: 'abc', type: 'text', title: 'Olá', html: '<p>oi</p>' },
      { type: 'faq', entries: [{ id: 'q1', question: 'A?', answer: 'B' }] },
      { id: 'x', type: 'invalido' },
      'string', null, 42, { id: 'y' },
    ]
    const out = parseSections(input)
    expect(out).toHaveLength(2)
    expect(out[0].id).toBe('abc')
    expect(out[0].type).toBe('text')
    expect(out[1].type).toBe('faq')
    expect(out[1].id).toBeTruthy()
  })
  it('devolve lista vazia para entradas que não são lista', () => {
    expect(parseSections(null)).toEqual([])
    expect(parseSections('x')).toEqual([])
    expect(parseSections({ type: 'text' })).toEqual([])
  })
  it('preenche os campos padrão do tipo', () => {
    const [s] = parseSections([{ id: 'p', type: 'properties' }])
    expect(s.type).toBe('properties')
    if (s.type === 'properties') { expect(s.mode).toBe('auto'); expect(s.limit).toBe(8) }
  })
  it('limita a 60 seções', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ id: `s${i}`, type: 'text', html: '' }))
    expect(parseSections(many)).toHaveLength(60)
  })
})

describe('v1.3 — modelos', () => {
  it('cityTemplate tem 15 seções com âncoras únicas na ordem pedida', () => {
    const t = cityTemplate('Samambaia')
    expect(t).toHaveLength(15)
    const anchors = t.map(s => s.anchor)
    expect(new Set(anchors).size).toBe(15)
    expect(anchors).toEqual(['historia', 'linha-do-tempo', 'nomes', 'numeros', 'visitar', 'academias', 'escolas', 'comercio', 'transporte', 'mapa', 'empreendimentos', 'imoveis', 'vender', 'blog', 'faq'])
    expect(t[0].title).toContain('Samambaia')
    expect(t.map(s => s.type)).toEqual(['text', 'timeline', 'people', 'stats', 'items', 'items', 'items', 'items', 'items', 'map', 'empreendimentos', 'properties', 'cta', 'blog', 'faq'])
    expect(new Set(t.map(s => s.id)).size).toBe(15)
  })
  it('partnerTemplate tem 4 seções', () => {
    const t = partnerTemplate('Construtora X')
    expect(t.map(s => s.type)).toEqual(['text', 'gallery', 'items', 'cta'])
    expect(t[0].title).toBe('Sobre Construtora X')
  })
  it('emptySection cobre todos os tipos do SECTION_LABEL', () => {
    for (const t of Object.keys(SECTION_LABEL) as Array<keyof typeof SECTION_LABEL>) {
      expect(emptySection(t).type).toBe(t)
    }
  })
})

describe('v1.3 — texto puro e tempo de leitura', () => {
  it('sectionsPlainText junta títulos, HTML sem tags e itens', () => {
    const sections: Section[] = [
      { id: '1', type: 'text', title: 'História', html: '<p>Fundada em <strong>1989</strong>.</p>' },
      { id: '2', type: 'items', items: [{ id: 'a', title: 'Parque', text: '<em>Verde</em>' }] },
      { id: '3', type: 'faq', entries: [{ id: 'q', question: 'Como chegar?', answer: 'De metrô.' }] },
      { id: '4', type: 'gallery', images: [{ url: '/x.jpg' }] },
    ]
    const txt = sectionsPlainText(sections)
    expect(txt).toContain('História')
    expect(txt).toContain('Fundada em 1989')
    expect(txt).not.toContain('<')
    expect(txt).toContain('Parque Verde')
    expect(txt).toContain('Como chegar? De metrô.')
  })
  it('readingMinutes: mínimo 1, 200 palavras por minuto', () => {
    expect(readingMinutes('')).toBe(1)
    expect(readingMinutes('oi tudo bem')).toBe(1)
    expect(readingMinutes(Array(600).fill('palavra').join(' '))).toBe(3)
  })
})

describe('v1.3 — sanitizeSections', () => {
  it('limpa scripts do HTML e URLs perigosas', () => {
    const out = sanitizeSections([
      { id: 't', type: 'text', html: '<p>ok</p><script>alert(1)</script>', imageUrl: 'javascript:alert(1)', anchor: 'Hist ória!' },
      { id: 'i', type: 'items', items: [{ id: 'a', title: '<b>Loja</b>', link: 'javascript:x', address: 'QR 300' }] },
      { id: 'p', type: 'properties', mode: 'manual', propertyIds: ['ok_id-1', 'bad id'], limit: 999 },
    ])
    expect(out[0].type).toBe('text')
    if (out[0].type === 'text') {
      expect(out[0].html).toBe('<p>ok</p>')
      expect(out[0].imageUrl).toBeUndefined()
      expect(out[0].anchor).toBe('histria')
    }
    if (out[1].type === 'items') {
      expect(out[1].items[0].title).toBe('Loja')
      expect(out[1].items[0].link).toBeUndefined()
      expect(out[1].items[0].address).toBe('QR 300')
    }
    if (out[2].type === 'properties') {
      expect(out[2].propertyIds).toEqual(['ok_id-1'])
      expect(out[2].limit).toBe(24)
    }
  })
})

describe('v1.3 — utilitários do renderizador', () => {
  it('converte URLs do YouTube para /embed/', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=abc123XYZ_-')).toBe('https://www.youtube.com/embed/abc123XYZ_-')
    expect(youtubeEmbedUrl('https://youtu.be/abc123XYZ?t=10')).toBe('https://www.youtube.com/embed/abc123XYZ')
    expect(youtubeEmbedUrl('https://www.youtube.com/shorts/abc123XYZ')).toBe('https://www.youtube.com/embed/abc123XYZ')
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?list=x&v=abc123XYZ')).toBe('https://www.youtube.com/embed/abc123XYZ')
    expect(youtubeEmbedUrl('https://vimeo.com/123')).toBeNull()
    expect(youtubeEmbedUrl('')).toBeNull()
  })
  it('monta o link de busca do Google Maps', () => {
    expect(mapsSearchUrl('QR 300, Samambaia')).toBe('https://www.google.com/maps/search/?api=1&query=QR%20300%2C%20Samambaia')
  })
})
