import { describe, it, expect } from 'vitest'
import { cleanPageTitle, stripBrandSuffix, TITLE_SUFFIX } from '@/lib/seo-title'
import { demoteH1, hasH1, addHeadingIds } from '@/lib/blog'
import { agentDisplay, ownerFallback, profileGaps, isSiteOwner } from '@/lib/agent-display'
import { empreendimentoFill, applyEmpreendimentoFill, isImportedProperty, parseList, isEmptyValue } from '@/lib/empreendimento-fill'
import { parseArea, formatArea, buildWhere } from '@/lib/property-filters'
import { toMapPin, shortPrice } from '@/lib/map-pins'
import { quadraVariants, searchTextWhere } from '@/lib/property-search'
import { jsonLdString } from '@/lib/og-image'

describe('v1.5 — título sem sufixo repetido', () => {
  it('tira "| Paulo Pop" gravado no título (mesmo repetido)', () => {
    expect(stripBrandSuffix('Apartamento 3 Suítes no Residencial Tom Jobim | Paulo Pop')).toBe('Apartamento 3 Suítes no Residencial Tom Jobim')
    expect(stripBrandSuffix('Casa em Samambaia | Paulo Pop | Paulo Pop')).toBe('Casa em Samambaia')
    expect(stripBrandSuffix('Casa - Paulo Pop Imóveis')).toBe('Casa')
    expect(stripBrandSuffix('Casa — Paulo Pop Corretor de Imóveis')).toBe('Casa')
  })
  it('não mexe em "Paulo Pop" no meio do texto', () => {
    expect(stripBrandSuffix('Indicação do Paulo Pop em Taguatinga')).toBe('Indicação do Paulo Pop em Taguatinga')
  })
  it('corta numa palavra inteira e o título final cabe em 65 caracteres', () => {
    const t = cleanPageTitle('Apartamento 3 Suítes no Residencial Tom Jobim Taguatinga Norte com vista livre | Paulo Pop')
    expect(t.length).toBeLessThanOrEqual(52)
    expect(t.endsWith(' ')).toBe(false)
    expect('Apartamento 3 Suítes no Residencial Tom Jobim Taguatinga Norte'.startsWith(t)).toBe(true)
    expect((t + TITLE_SUFFIX).length).toBeLessThanOrEqual(65)
  })
  it('título curto fica igual', () => {
    expect(cleanPageTitle('Casa 3 quartos em Samambaia')).toBe('Casa 3 quartos em Samambaia')
  })
})

describe('v1.5 — H1 dentro do post vira H2', () => {
  it('troca h1 por h2 e o título entra no índice', () => {
    const html = '<h1 class="x">Contrato exclusivo</h1><p>a</p><h2>Etapas</h2>'
    expect(hasH1(html)).toBe(true)
    const out = demoteH1(html)
    expect(out).not.toMatch(/<h1/i)
    expect(out).toContain('<h2 class="x">Contrato exclusivo</h2>')
    const { toc } = addHeadingIds(out)
    expect(toc.map(t => t.text)).toEqual(['Contrato exclusivo', 'Etapas'])
  })
  it('texto sem H1 não gera aviso', () => {
    expect(hasH1('<h2>Ok</h2><p>texto</p>')).toBe(false)
  })
})

describe('v1.5 — cartão do corretor com reserva das Configurações', () => {
  const config = { ownerName: 'Corretor Paulo Pop', ownerPhotoUrl: '/uploads/paulo.jpg', ownerCreci: '12896/DF', ownerCompany: 'REMAX INOVELAR', ownerWhatsapp: '61984090968', ownerPhone: null, ownerEmail: 'paulo@site.com' }
  it('dono do site sem foto e sem nome público usa os dados das Configurações', () => {
    const agent = { name: 'Paulo', publicName: '', avatarUrl: null, creci: null, company: '', companyRole: null, phone: null, whatsapp: null, role: 'ADMIN', email: 'x@y.com' }
    const d = agentDisplay(agent, ownerFallback(agent, config))
    expect(d.avatarUrl).toBe('/uploads/paulo.jpg')
    expect(d.name).toBe('Corretor Paulo Pop')
    expect(d.creci).toBe('CRECI/DF Nº 12896')
    expect(d.companyLine).toBe('Corretor Associado REMAX INOVELAR')
    expect(d.phone).toBe('(61) 98409-0968')
  })
  it('outro corretor não recebe a foto, o nome nem o CRECI do Paulo', () => {
    const agent = { name: 'Maria', avatarUrl: null, creci: null, company: null, role: 'AGENT', email: 'maria@site.com' }
    expect(isSiteOwner(agent, config)).toBe(false)
    const d = agentDisplay(agent, ownerFallback(agent, config))
    expect(d.avatarUrl).toBeNull()
    expect(d.name).toBe('Maria')
    expect(d.creci).toBeNull()
    expect(d.companyLine).toBe('Corretor Associado REMAX INOVELAR')
  })
  it('corretor com e-mail igual ao de Configurações conta como dono', () => {
    expect(isSiteOwner({ role: 'AGENT', email: 'PAULO@site.com' }, config)).toBe(true)
  })
  it('dados próprios do Meu perfil têm prioridade', () => {
    const agent = { name: 'Paulo', publicName: 'Paulo Pop', avatarUrl: '/uploads/meu.jpg', creci: '12896/DF', company: 'REMAX INOVELAR', role: 'ADMIN' }
    const d = agentDisplay(agent, ownerFallback(agent, config))
    expect(d.avatarUrl).toBe('/uploads/meu.jpg')
    expect(d.name).toBe('Paulo Pop')
  })
  it('lista o que falta e a imobiliária diferente das Configurações', () => {
    const gaps = profileGaps({ name: 'Paulo', publicName: '', avatarUrl: null, creci: '12896/DF', company: 'Paulo Pop Imoveis', companyRole: '', whatsapp: '61984090968', role: 'ADMIN' }, config)
    const fields = gaps.map(g => g.field)
    expect(fields).toEqual(['avatarUrl', 'publicName', 'company', 'companyRole'])
    expect(gaps[0].fromConfig).toBe(true)
    expect(gaps[2].label).toContain('Paulo Pop Imoveis')
  })
  it('perfil completo não gera aviso', () => {
    expect(profileGaps({ name: 'P', publicName: 'Corretor Paulo Pop', avatarUrl: '/a.jpg', creci: '1/DF', company: 'REMAX INOVELAR', companyRole: 'Corretor Associado', whatsapp: '61999999999', role: 'ADMIN' }, config)).toEqual([])
  })
})

describe('v1.5 — preenchimento do imóvel pelo empreendimento', () => {
  const emp = {
    name: 'Residencial Tom Jobim', tagline: 'Viva bem em Taguatinga', description: '<p>Prédio com <b>2 torres</b>.</p>',
    address: 'QS 1 Rua 210', neighborhood: 'Taguatinga Sul', city: 'Taguatinga', state: 'DF', zipCode: '71950-000',
    latitude: -15.84, longitude: -48.05, locationDescription: 'Perto do metrô.', floors: 12, totalUnits: 96,
    stage: 'ENTREGUE', deliveryYear: 2019, condoFeeAvg: '650.00', lazerDescription: 'Piscina e academia',
    amenities: 'Piscina\nAcademia\nSalão de festas', highlights: '["Portaria 24h"]', youtubeUrl: 'https://youtu.be/abc',
    coverUrl: '/uploads/capa.jpg',
    images: [
      { url: '/uploads/lazer1.jpg', category: 'LAZER', order: 0 },
      { url: '/uploads/fachada1.jpg', category: 'FACHADA', order: 0 },
    ],
  }
  const unitType = { name: '3 quartos', bedrooms: 3, suites: 1, bathrooms: 2, area: '78.5', totalArea: 95, parking: 2, balconies: 1, floorPlanUrl: '/uploads/planta.jpg' }

  it('monta campos, textos, características e fotos (fachada antes do lazer)', () => {
    const fill = empreendimentoFill(emp, unitType, { floor: 7, number: '701' })
    expect(fill.fields).toMatchObject({
      address: 'QS 1 Rua 210', neighborhood: 'Taguatinga Sul', city: 'Taguatinga', state: 'DF', latitude: -15.84,
      buildingFloors: 12, unitsInBuilding: 96, condominiumFee: 650, constructionYear: 2019,
      bedrooms: 3, suites: 1, bathrooms: 2, totalParkingSpots: 2, usefulArea: 78.5, totalArea: 95, balconies: 1, floor: '7',
      surroundingsInfo: 'Perto do metrô.',
    })
    expect(String(fill.fields.description)).toContain('Sobre o Residencial Tom Jobim\nPrédio com 2 torres.')
    expect(String(fill.fields.description)).toContain('• Academia')
    expect(fill.extraFeatures).toEqual(['Piscina', 'Academia', 'Salão de festas', 'Portaria 24h'])
    expect(fill.photos.map(p => p.url)).toEqual(['/uploads/capa.jpg', '/uploads/fachada1.jpg', '/uploads/lazer1.jpg', '/uploads/planta.jpg'])
    expect(fill.videoUrl).toBe('https://youtu.be/abc')
  })

  it('lançamento vira condição "Na planta" e não grava ano de construção', () => {
    const fill = empreendimentoFill({ ...emp, stage: 'LANCAMENTO', deliveryYear: 2028 })
    expect(fill.fields.condition).toBe('Na planta')
    expect(fill.fields.constructionYear).toBeUndefined()
  })

  it('imóvel cadastrado no painel: só campos vazios, fotos do prédio no fim, capa mantida', () => {
    const current = {
      address: '', city: 'Taguatinga', neighborhood: null, bedrooms: 0, suites: 2, price: '450000',
      description: 'Apartamento reformado.', extraFeatures: [], videos: [],
      images: [{ id: 'a', url: '/uploads/sala.jpg', isCover: true }],
    }
    const fill = empreendimentoFill(emp, unitType)
    const { patch, filled } = applyEmpreendimentoFill(current, fill, { imported: false })
    expect(patch.address).toBe('QS 1 Rua 210')
    expect(patch.neighborhood).toBe('Taguatinga Sul')
    expect(patch.bedrooms).toBe(3)
    expect('city' in patch).toBe(false)
    expect('suites' in patch).toBe(false)
    expect('description' in patch).toBe(false)
    expect('price' in patch).toBe(false)
    const imgs = patch.images as { url: string; isCover: boolean }[]
    expect(imgs[0]).toMatchObject({ url: '/uploads/sala.jpg', isCover: true })
    expect(imgs.slice(1).every(i => !i.isCover)).toBe(true)
    expect(imgs).toHaveLength(5)
    expect(filled).toContain('Fotos (4)')
  })

  it('imóvel importado: completa o que falta e não mexe na galeria', () => {
    const current = { importedAt: '2026-09-30', sourcePortal: 'dfimoveis', address: 'Endereço do anúncio', bedrooms: 2, images: [{ id: 'x', url: 'https://portal/foto.jpg' }], videos: [] }
    expect(isImportedProperty(current)).toBe(true)
    const { patch } = applyEmpreendimentoFill(current, empreendimentoFill(emp, unitType), { imported: true })
    expect('address' in patch).toBe(false)
    expect('bedrooms' in patch).toBe(false)
    expect('images' in patch).toBe(false)
    expect(patch.condominiumFee).toBe(650)
  })

  it('imóvel importado sem nenhuma foto recebe as do prédio', () => {
    const { patch } = applyEmpreendimentoFill({ sourcePortal: 'olx', images: [] }, empreendimentoFill(emp), { imported: true })
    const imgs = patch.images as { isCover: boolean }[]
    expect(imgs.length).toBe(3)
    expect(imgs[0].isCover).toBe(true)
  })

  it('não repete foto que já está na galeria e não troca vídeo existente', () => {
    const current = { images: [{ url: '/uploads/capa.jpg' }], videos: [{ youtubeUrl: 'https://youtu.be/meu' }] }
    const { patch } = applyEmpreendimentoFill(current, empreendimentoFill(emp), { imported: false })
    expect((patch.images as unknown[]).length).toBe(3)
    expect('videos' in patch).toBe(false)
  })

  it('lista de amenidades em JSON ou uma por linha', () => {
    expect(parseList('["A","B"]')).toEqual(['A', 'B'])
    expect(parseList('- A\n• B\nC')).toEqual(['A', 'B', 'C'])
    expect(parseList('')).toEqual([])
    expect(isEmptyValue('bedrooms', '0')).toBe(true)
    expect(isEmptyValue('floor', '0')).toBe(false)
  })
})

describe('v1.5 — busca por mapa', () => {
  it('lê e valida o retângulo do mapa', () => {
    expect(parseArea('-15.9,-48.2,-15.7,-47.9')).toEqual({ south: -15.9, west: -48.2, north: -15.7, east: -47.9 })
    expect(parseArea('-15.7,-48.2,-15.9,-47.9')).toBeNull()
    expect(parseArea('abc')).toBeNull()
    expect(parseArea('')).toBeNull()
    expect(formatArea({ south: -15.912345678, west: -48.2, north: -15.7, east: -47.9 })).toBe('-15.91235,-48.2,-15.7,-47.9')
  })
  it('a área entra no filtro da lista e do mapa', () => {
    const w = buildWhere({ area: '-15.9,-48.2,-15.7,-47.9', transacao: 'comprar' }) as Record<string, unknown>
    expect(w.latitude).toEqual({ gte: -15.9, lte: -15.7 })
    expect(w.longitude).toEqual({ gte: -48.2, lte: -47.9 })
    expect(w.transactionType).toBe('SALE')
    expect('latitude' in (buildWhere({ area: 'x' }) as object)).toBe(false)
  })
  it('pino aproximado quando o endereço completo não é liberado', () => {
    const base = { id: '1', slug: 's', latitude: '-15.8412345', longitude: '-48.0567891', price: '320000', hidePrice: false, title: null, propertyType: 'Apartamento', transactionType: 'SALE', bedrooms: 2, usefulArea: '60', totalArea: null, neighborhood: 'Samambaia Sul', city: 'Samambaia', images: [] }
    const approx = toMapPin({ ...base, showFullAddress: false })!
    expect(approx).toMatchObject({ lat: -15.841, lng: -48.057, approx: true, title: 'Apartamento em Samambaia Sul', area: 60 })
    const exact = toMapPin({ ...base, showFullAddress: true })!
    expect(exact.lat).toBeCloseTo(-15.8412345)
    expect(toMapPin({ ...base, showFullAddress: true, latitude: null })).toBeNull()
    expect(toMapPin({ ...base, showFullAddress: true, hidePrice: true })!.price).toBeNull()
  })
  it('rótulo curto do preço', () => {
    expect(shortPrice(320000, 'SALE')).toBe('R$ 320 mil')
    expect(shortPrice(1250000, 'SALE')).toBe('R$ 1,25 mi')
    expect(shortPrice(2500, 'RENT')).toBe('R$ 2.500')
    expect(shortPrice(null, 'SALE')).toBe('Consulte')
  })
  it('quadra escrita de jeitos diferentes', () => {
    expect(quadraVariants('qn303')).toEqual(['QN 303', 'QN-303'])
    expect(quadraVariants('QN 303 conjunto 5')).toEqual(['QN303 conjunto 5', 'QN-303 conjunto 5'])
    expect(quadraVariants('Samambaia')).toEqual([])
    expect(searchTextWhere('qr 401').length).toBeGreaterThan(searchTextWhere('Samambaia').length)
  })
})

describe('v1.5 — JSON-LD seguro', () => {
  it('não deixa fechar a tag script', () => {
    expect(jsonLdString({ name: '</script><script>alert(1)</script>' })).not.toContain('</script>')
  })
})
