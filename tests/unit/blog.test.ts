import { describe, it, expect } from 'vitest'
import {
  addHeadingIds, headingSlug, computeReadingMinutes, isVisiblePost, postVisibility, blogPublishedWhere,
  parseBrasiliaDateTime, toBrasiliaInput, contentToHtml, excerptFromContent, whatsappLink,
} from '@/lib/blog'
import type { Section } from '@/lib/sections'

describe('v1.3 — blog: addHeadingIds', () => {
  it('adiciona ids nos h2/h3 e monta o índice na ordem', () => {
    const html = '<p>intro</p><h2>Como funciona o financiamento</h2><p>x</p><h3>Taxas e prazos</h3><h2>Documentação</h2>'
    const { html: out, toc } = addHeadingIds(html)
    expect(toc).toEqual([
      { id: 'como-funciona-o-financiamento', text: 'Como funciona o financiamento', level: 2 },
      { id: 'taxas-e-prazos', text: 'Taxas e prazos', level: 3 },
      { id: 'documentacao', text: 'Documentação', level: 2 },
    ])
    expect(out).toContain('<h2 id="como-funciona-o-financiamento">')
    expect(out).toContain('<h3 id="taxas-e-prazos">')
    expect(out).toContain('<h2 id="documentacao">')
    expect(out).toContain('<p>intro</p>')
  })

  it('ignora h1/h4, mantém ids existentes e remove tags internas do texto do índice', () => {
    const html = '<h1>Título</h1><h2 id="meu-id" class="x"><strong>Passo</strong> um</h2><h4>Sub</h4>'
    const { html: out, toc } = addHeadingIds(html)
    expect(toc).toEqual([{ id: 'meu-id', text: 'Passo um', level: 2 }])
    expect(out).toContain('<h2 id="meu-id" class="x"><strong>Passo</strong> um</h2>')
    expect(out).toContain('<h1>Título</h1>')
    expect(out).toContain('<h4>Sub</h4>')
  })

  it('gera sufixos para títulos repetidos e ignora títulos vazios', () => {
    const { toc, html } = addHeadingIds('<h2>Dicas</h2><h2>Dicas</h2><h3>dicas</h3><h2></h2><h2>   </h2>')
    expect(toc.map(t => t.id)).toEqual(['dicas', 'dicas-2', 'dicas-3'])
    expect(html).toContain('<h2></h2>')
  })

  it('devolve o HTML intacto quando não há títulos', () => {
    const { html, toc } = addHeadingIds('<p>só texto</p>')
    expect(html).toBe('<p>só texto</p>')
    expect(toc).toEqual([])
  })

  it('headingSlug remove acentos e entidades', () => {
    expect(headingSlug('Águas Claras &amp; Taguatinga: guia')).toBe('aguas-claras-taguatinga-guia')
    expect(headingSlug('!!!')).toBe('secao')
  })
})

describe('v1.3 — blog: tempo de leitura', () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `palavra${i}`).join(' ')

  it('mínimo de 1 minuto para textos curtos', () => {
    expect(computeReadingMinutes('<p>Oi</p>')).toBe(1)
    expect(computeReadingMinutes('')).toBe(1)
  })

  it('conta ~200 palavras por minuto ignorando tags', () => {
    expect(computeReadingMinutes(`<p>${words(400)}</p>`)).toBe(2)
    expect(computeReadingMinutes(`<h2>${words(100)}</h2><ul><li>${words(500)}</li></ul>`)).toBe(3)
  })

  it('soma o texto dos blocos extras', () => {
    const sections: Section[] = [
      { id: 'a', type: 'text', title: 'Bloco', html: `<p>${words(300)}</p>` },
      { id: 'b', type: 'faq', entries: [{ id: 'q', question: words(50), answer: `<p>${words(50)}</p>` }] },
    ]
    // 200 (corpo) + 300 + 100 + título ≈ 600 palavras → 3 min
    expect(computeReadingMinutes(`<p>${words(200)}</p>`, sections)).toBe(3)
  })

  it('palavras coladas em tags não são fundidas', () => {
    expect(computeReadingMinutes(`<p>${words(150)}</p><p>${words(150)}</p>`)).toBe(2)
  })
})

describe('v1.3 — blog: visibilidade e agendamento', () => {
  const now = new Date('2026-09-29T12:00:00Z')

  it('rascunho nunca é visível', () => {
    expect(isVisiblePost({ status: 'DRAFT', publishedAt: new Date('2020-01-01') }, now)).toBe(false)
    expect(postVisibility({ status: 'DRAFT', publishedAt: null }, now)).toBe('draft')
  })

  it('publicado com data futura é agendado; com data passada é publicado', () => {
    expect(postVisibility({ status: 'PUBLISHED', publishedAt: new Date('2026-10-01T00:00:00Z') }, now)).toBe('scheduled')
    expect(isVisiblePost({ status: 'PUBLISHED', publishedAt: '2026-10-01T00:00:00Z' }, now)).toBe(false)
    expect(postVisibility({ status: 'PUBLISHED', publishedAt: new Date('2026-09-01T00:00:00Z') }, now)).toBe('published')
    expect(isVisiblePost({ status: 'PUBLISHED', publishedAt: null }, now)).toBe(true)
  })

  it('blogPublishedWhere filtra status e data', () => {
    expect(blogPublishedWhere(now)).toEqual({ status: 'PUBLISHED', publishedAt: { lte: now } })
  })

  it('converte datas de/para o horário de Brasília (UTC-3)', () => {
    const d = parseBrasiliaDateTime('2026-09-29T09:30')
    expect(d?.toISOString()).toBe('2026-09-29T12:30:00.000Z')
    expect(toBrasiliaInput(d)).toBe('2026-09-29T09:30')
    expect(toBrasiliaInput(new Date('2026-12-31T23:59:00Z'))).toBe('2026-12-31T20:59')
    expect(parseBrasiliaDateTime('')).toBeNull()
    expect(parseBrasiliaDateTime('abc')).toBeNull()
    expect(parseBrasiliaDateTime('2026-09-29T12:30:00.000Z')?.toISOString()).toBe('2026-09-29T12:30:00.000Z')
  })
})

describe('v1.3 — blog: utilidades', () => {
  it('contentToHtml converte Markdown antigo e mantém HTML', () => {
    expect(contentToHtml('<p>oi</p>')).toBe('<p>oi</p>')
    expect(contentToHtml('## Título\n\nTexto **forte**')).toContain('<h2>Título</h2>')
    expect(contentToHtml('## Título\n\nTexto **forte**')).toContain('<p>Texto <strong>forte</strong></p>')
  })

  it('excerptFromContent corta em palavra inteira', () => {
    const out = excerptFromContent('<p>Uma frase bem longa para testar o corte do resumo automático do post</p>', 30)
    expect(out.length).toBeLessThanOrEqual(30)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toMatch(/\s…$/)
  })

  it('whatsappLink monta wa.me com DDI e mensagem', () => {
    expect(whatsappLink('(61) 99999-0000', 'Quero receber as novidades do blog')).toBe('https://wa.me/5561999990000?text=Quero%20receber%20as%20novidades%20do%20blog')
    expect(whatsappLink('5561999990000', 'x')).toBe('https://wa.me/5561999990000?text=x')
    expect(whatsappLink('', 'x')).toBe('/contato')
  })
})
