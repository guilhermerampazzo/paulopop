/**
 * v1.4 — testes das funções puras: hub do corretor, preço por m², mapa estático, ordem de busca por quadra,
 * candidatas, leitor de portais, texto colado e servidor do conector (JSON-RPC).
 */
import { describe, it, expect } from 'vitest'
import seed from '@/data/samambaia-quadras.json'
import { formatCreci, formatPhoneBR, agentCompanyLine, agentDisplay } from '@/lib/agent-display'
import { sqmVerdict, sqmPublicView, normalizeSqmMode } from '@/lib/sqm-display'
import { pricePerSqmClient } from '@/lib/sqm-client'
import { pricePerSqmValue, needsPublishAuthorization } from '@/lib/property-compare'
import { planStaticMap, validCoords, lngToX, latToY } from '@/lib/static-map'
import { computeStudy, isApprovedSample } from '@/lib/market-study'
import { parseQuadraRefs, matchQuadra, sisterQuadras, neighborQuadras, buildSearchPlan, nextSearchStep, emptyCursor, normalizeCursor, type QuadraRow } from '@/lib/intel/quadras'
import { normalizeListingUrl, externalIdFromUrl } from '@/lib/intel/url-key'
import { parseNumberBR } from '@/lib/intel/number'
import { htmlToText } from '@/lib/portal-reader/parse'
import { isPublicStatus } from '@/lib/property-compare'
import { cleanCandidate, looksLikeSameListing, candidateTags } from '@/lib/intel/candidates'
import { rankSiteMatches, typeFamily } from '@/lib/intel/site-search'
import { normalizeSearchParams } from '@/lib/intel/db'
import { buildClaudePrompt } from '@/lib/intel/prompt'
import { parseListingHtml, parseListingText, extractFromText, parseMoney, portalOf, guessType, guessTransaction, guessCity, cleanPhotoUrls } from '@/lib/portal-reader/parse'
import { sanitizeDraft, sourceIdOf } from '@/lib/portal-reader/import'
import { isPrivateAddress, assertPublicHttpsUrl, hostAllowed, UnsafeUrlError } from '@/lib/net/safe-fetch'
import { handleRpc, handleBody, ToolError, PROTOCOL_VERSIONS, type ToolDef } from '@/lib/mcp/server'
import { generateToken, hashToken, looksLikeToken, bearerFrom } from '@/lib/mcp/auth'
import { normalizePropertyUpdateInput } from '@/lib/property-update'

const QUADRAS: QuadraRow[] = seed.quadras.map(q => ({ ...q, city: seed.city }))

describe('v1.4 — hub do corretor', () => {
  it('formata o CRECI no padrão pedido', () => {
    expect(formatCreci('12896/DF')).toBe('CRECI/DF Nº 12896')
    expect(formatCreci('CRECI 12896 DF')).toBe('CRECI/DF Nº 12896')
    expect(formatCreci('DF-12896')).toBe('CRECI/DF Nº 12896')
    expect(formatCreci('12896')).toBe('CRECI Nº 12896')
    expect(formatCreci('')).toBeNull()
  })
  it('formata o telefone com DDD', () => {
    expect(formatPhoneBR('61984090968')).toBe('(61) 98409-0968')
    expect(formatPhoneBR('5561984090968')).toBe('(61) 98409-0968')
    expect(formatPhoneBR('(61)98409-0968')).toBe('(61) 98409-0968')
    expect(formatPhoneBR(null)).toBeNull()
  })
  it('monta a linha da imobiliária e o cartão', () => {
    expect(agentCompanyLine('REMAX INOVELAR', 'Corretor Associado')).toBe('Corretor Associado REMAX INOVELAR')
    expect(agentCompanyLine('REMAX INOVELAR', null)).toBe('Corretor Associado REMAX INOVELAR')
    const d = agentDisplay({ name: 'Paulo Roberto', publicName: 'Corretor Paulo Pop', whatsapp: '61984090968', creci: '12896/DF', company: 'REMAX INOVELAR', companyRole: 'Corretor Associado' })
    expect(d).toMatchObject({ name: 'Corretor Paulo Pop', phone: '(61) 98409-0968', whatsappDigits: '5561984090968', creci: 'CRECI/DF Nº 12896', companyLine: 'Corretor Associado REMAX INOVELAR' })
  })
})

describe('v1.4 — preço por m² comparado (faixa de tolerância)', () => {
  it('abaixo da referência mostra o percentual', () => {
    expect(sqmVerdict(4500, 5000)).toMatchObject({ verdict: 'below', text: '10% abaixo da referência' })
  })
  it('até 10% acima vira "Imóvel no preço de mercado", sem números', () => {
    expect(sqmVerdict(5000, 5000)).toMatchObject({ verdict: 'market', text: 'Imóvel no preço de mercado' })
    expect(sqmVerdict(5500, 5000).verdict).toBe('market')
    expect(sqmVerdict(4950, 5000).verdict).toBe('market') // -1%: ainda "no preço"
  })
  it('mais de 10% acima some do público', () => {
    expect(sqmVerdict(5501, 5000).verdict).toBe('hidden')
    expect(sqmVerdict(7000, 5000)).toMatchObject({ verdict: 'hidden', text: '' })
  })
  it('modo manual usa a referência do corretor; oculto não mostra nada', () => {
    const auto = { region: { avg: 4000, count: 5, label: 'Samambaia Sul' }, building: null }
    expect(sqmPublicView({ own: 5000, mode: 'AUTO', auto }).headline).toBe('hidden')
    const manual = sqmPublicView({ own: 5000, mode: 'MANUAL', auto, manual: { value: 5200, label: 'Média da quadra' } })
    expect(manual.headline).toBe('below')
    expect(manual.items[0].ref).toMatchObject({ kind: 'manual', label: 'Média da quadra' })
    expect(sqmPublicView({ own: 3000, mode: 'HIDDEN', auto }).items).toEqual([])
    expect(normalizeSqmMode('qualquer')).toBe('AUTO')
  })
  it('calcula o R$/m² sozinho: preço ÷ área útil (sem ela, área total)', () => {
    expect(pricePerSqmValue(250000, 50, 60)).toBe(5000)
    expect(pricePerSqmValue(250000, null, 62.5)).toBe(4000)
    expect(pricePerSqmValue(null, 50, 60)).toBeNull()
    expect(pricePerSqmClient('250000', '50', '')).toBe(5000)
    expect(pricePerSqmClient('', '50', '')).toBeNull()
  })
  it('salvar imóvel: limpa os campos do hub e protege a confirmação de autorização', () => {
    const out = normalizePropertyUpdateInput({ sqmCompareMode: 'x', sqmRefLabel: '<b>Média</b> da quadra', sqmRefValue: '5.200,5'.replace('.', ''), publishAuthConfirmedAt: '2026-01-01', sourcePhotoUrls: ['x'] })
    expect(out.sqmCompareMode).toBe('AUTO')
    expect(out.sqmRefLabel).toBe('Média da quadra')
    expect(out.sqmRefValue).toBe(5200.5)
    expect('publishAuthConfirmedAt' in out).toBe(false)
    expect('sourcePhotoUrls' in out).toBe(false)
  })
})

describe('v1.4 — publicação de anúncio importado', () => {
  it('só anúncio de terceiros sem confirmação precisa de autorização', () => {
    expect(needsPublishAuthorization({ sourcePortal: 'dfimoveis', publishAuthConfirmedAt: null })).toBe(true)
    expect(needsPublishAuthorization({ sourcePortal: 'colado', publishAuthConfirmedAt: null })).toBe(true)
    expect(needsPublishAuthorization({ sourcePortal: 'olx', publishAuthConfirmedAt: new Date() })).toBe(false)
    expect(needsPublishAuthorization({ sourcePortal: 'remax', publishAuthConfirmedAt: null })).toBe(false)
    expect(needsPublishAuthorization({ sourcePortal: null })).toBe(false)
  })
})

describe('v1.4 — mapa estático da ficha impressa', () => {
  it('planeja o mosaico com o marcador no centro', () => {
    const p = planStaticMap(-15.87, -48.09, 15, 640, 360)
    expect(p.marker).toEqual({ x: 320, y: 180 })
    expect(p.tiles.length).toBeGreaterThanOrEqual(6)
    expect(p.tiles.length).toBeLessThanOrEqual(12)
    for (const t of p.tiles) { expect(t.left).toBeGreaterThan(-256); expect(t.left).toBeLessThan(640); expect(t.top).toBeGreaterThan(-256); expect(t.top).toBeLessThan(360) }
    expect(lngToX(0, 0)).toBe(128)
    expect(Math.round(latToY(0, 0))).toBe(128)
  })
  it('recusa coordenadas inválidas', () => {
    expect(validCoords(-15.8, -48.1)).toBe(true)
    expect(validCoords(0, 0)).toBe(false)
    expect(validCoords(NaN, 1)).toBe(false)
    expect(validCoords(91, 0)).toBe(false)
  })
})

describe('v1.4 — estudo: candidatas ficam fora do cálculo', () => {
  it('só as aprovadas contam', () => {
    const r = computeStudy([
      { id: 'a', price: 200000, areaPrivate: 50, candidateStatus: 'APPROVED' },
      { id: 'b', price: 300000, areaPrivate: 50 }, // antiga, sem o campo: aprovada
      { id: 'c', price: 900000, areaPrivate: 50, candidateStatus: 'CANDIDATE' },
      { id: 'd', price: 100000, areaPrivate: 50, candidateStatus: 'REJECTED' },
    ], { areaPrivate: 50 })
    expect(r.n).toBe(2)
    expect(r.nValid).toBe(2)
    expect(r.mean).toBe(5000)
    expect(r.samples.map(s => s.id)).toEqual(['a', 'b'])
    expect(isApprovedSample({ candidateStatus: 'CANDIDATE' })).toBe(false)
  })
})

describe('v1.4 — Área de Inteligência: quadras de Samambaia', () => {
  it('a base tem 350 quadras com posição no mapa', () => {
    expect(QUADRAS.length).toBe(350)
    expect(QUADRAS.filter(q => q.mapX == null || q.mapY == null).length).toBe(0)
    expect(new Set(QUADRAS.map(q => q.quadra)).size).toBe(350)
  })
  it('encontra a quadra em endereços escritos de vários jeitos', () => {
    expect(parseQuadraRefs('QR 303 Conjunto 5 Lote 12')).toEqual([{ prefix: 'QR', number: 303 }])
    expect(parseQuadraRefs('Qd. 303, conj 5')).toEqual([{ prefix: null, number: 303 }])
    expect(parseQuadraRefs('QN-303')).toEqual([{ prefix: 'QN', number: 303 }])
    expect(matchQuadra('Apto QN 303 Conj 2, Samambaia Sul', QUADRAS)?.quadra).toBe('QN 303')
    expect(matchQuadra('Quadra 303 conjunto 5', QUADRAS)?.quadra).toBe('QR 303')
    expect(matchQuadra('Rua das Flores 12', QUADRAS)).toBeNull()
  })
  it('acha as de mesma numeração e as vizinhas por distância', () => {
    const base = QUADRAS.find(q => q.quadra === 'QN 303')!
    expect(sisterQuadras(base, QUADRAS).map(q => q.quadra)).toEqual(['QR 303', 'QS 303'])
    const near = neighborQuadras(base, QUADRAS, 10)
    expect(near.length).toBe(10)
    for (let i = 1; i < near.length; i++) expect(near[i].distM).toBeGreaterThanOrEqual(near[i - 1].distM)
    expect(near[0].distM).toBeLessThan(600)
  })
  it('monta a ordem: site → condomínio → quadra → mesma numeração → vizinhas → bairro → cidade', () => {
    const base = QUADRAS.find(q => q.quadra === 'QN 303')!
    const plan = buildSearchPlan({ city: 'Samambaia', neighborhood: 'Samambaia Sul', condo: 'Residencial Teste', base, quadras: QUADRAS, maxNeighbors: 5 })
    expect(plan.map(s => s.kind)).toEqual(['SITE', 'CONDO', 'QUADRA', 'IRMA', 'IRMA', 'VIZINHA', 'VIZINHA', 'VIZINHA', 'VIZINHA', 'VIZINHA', 'BAIRRO', 'CIDADE'])
    expect(plan[2].quadra).toBe('QN 303')
    expect(plan.slice(3, 5).map(s => s.quadra)).toEqual(['QR 303', 'QS 303'])
    expect(plan[2].terms).toContain('QN 303')
    const viz = plan.filter(s => s.kind === 'VIZINHA')
    expect(new Set(viz.map(s => s.quadra)).has('QR 303')).toBe(false)
    for (let i = 1; i < viz.length; i++) expect(viz[i].distM!).toBeGreaterThanOrEqual(viz[i - 1].distM!)
  })
  it('sem base de quadras a busca vai por bairro e cidade', () => {
    const plan = buildSearchPlan({ city: 'Taguatinga - DF', neighborhood: 'Taguatinga Norte', base: null, quadras: [] })
    expect(plan.map(s => s.kind)).toEqual(['SITE', 'BAIRRO', 'CIDADE'])
  })
  it('avança quadra a quadra, para na meta e retoma quando uma amostra é recusada', () => {
    const base = QUADRAS.find(q => q.quadra === 'QN 303')!
    const plan = buildSearchPlan({ city: 'Samambaia', neighborhood: 'Samambaia Sul', base, quadras: QUADRAS, maxNeighbors: 3 })
    let r = nextSearchStep({ plan, cursor: emptyCursor(), have: 0, target: 6 })
    expect(r.step?.kind).toBe('SITE')
    expect(r.portals).toEqual(['Site corretorpaulopop.com'])
    r = nextSearchStep({ plan, cursor: r.cursor, have: 1, target: 6, advance: true })
    expect(r.step?.quadra).toBe('QN 303')
    expect(r.portals).toEqual(['WImóveis', 'DF Imóveis', 'OLX'])
    expect(r.missing).toBe(5)
    r = nextSearchStep({ plan, cursor: r.cursor, have: 4, target: 6, advance: true })
    expect(r.step?.quadra).toBe('QR 303')
    // meta atingida: para
    const done = nextSearchStep({ plan, cursor: r.cursor, have: 6, target: 6, advance: true })
    expect(done).toMatchObject({ done: true, reason: 'META_ATINGIDA' })
    // o corretor recusou uma: retoma do ponto em que parou (QS 303), sem voltar ao início
    const again = nextSearchStep({ plan, cursor: done.cursor, have: 5, target: 6 })
    expect(again.done).toBe(false)
    expect(again.step?.quadra).toBe('QS 303')
    expect(again.cursor.done.map(d => d.kind)).toEqual(['SITE', 'QUADRA', 'IRMA'])
  })
  it('acabando os portais prioritários, repete a partir do passo 2 nos demais', () => {
    const plan = buildSearchPlan({ city: 'Samambaia', neighborhood: null, base: QUADRAS.find(q => q.quadra === 'QN 303')!, quadras: QUADRAS, maxNeighbors: 0 })
    let cur = emptyCursor()
    let r = nextSearchStep({ plan, cursor: cur, have: 0, target: 9 })
    for (let i = 0; i < plan.length; i++) { r = nextSearchStep({ plan, cursor: cur, have: 0, target: 9, advance: true }); cur = r.cursor }
    expect(r.cursor.tier).toBe(1)
    expect(r.step?.kind).toBe('QUADRA')
    expect(r.portals).toEqual(['VivaReal', 'ZAP', 'Imovelweb', 'Chaves na Mão'])
    for (let i = 0; i < plan.length; i++) { r = nextSearchStep({ plan, cursor: cur, have: 0, target: 9, advance: true }); cur = r.cursor }
    expect(r).toMatchObject({ done: true, reason: 'ORDEM_ESGOTADA' })
    expect(normalizeCursor({ tier: 7, index: -2, done: 'x' })).toEqual({ tier: 0, index: 0, done: [] })
  })
  it('parâmetros da pesquisa são limitados e limpos', () => {
    const p = normalizeSearchParams({ quadra: ' QR 303 ', condo: '<b>Parque</b>', areaTolPct: 500, bedroomsTol: -1, maxAdDays: 'x', portals: ['OLX', 3, ''], rules: 'só com elevador' })
    expect(p).toMatchObject({ quadra: 'QR 303', condo: 'Parque', areaTolPct: 100, bedroomsTol: 0, maxAdDays: null, portals: ['OLX'], rules: 'só com elevador' })
  })
  it('o pedido para o Claude cita o estudo, a ordem e as regras', () => {
    const t = buildClaudePrompt({ id: 'abc123', title: 'Apto QN 303', targetSamples: 8 }, 'só com elevador')
    expect(t).toContain('estudo_id: abc123')
    expect(t).toContain('buscar_no_site')
    expect(t).toContain('Meta: 8 amostras')
    expect(t).toContain('só com elevador')
    expect(t).toContain('Não aprove')
  })
})

describe('v1.4 — candidatas e banco de amostras', () => {
  it('normaliza o link: sem www, sem rastreio, sem barra final', () => {
    const a = normalizeListingUrl('https://www.dfimoveis.com.br/imovel/apartamento-2-quartos-samambaia-123456/?utm_source=x#fotos')
    const b = normalizeListingUrl('https://dfimoveis.com.br/imovel/apartamento-2-quartos-samambaia-123456')
    expect(a?.urlKey).toBe(b?.urlKey)
    expect(a?.host).toBe('dfimoveis.com.br')
    expect(normalizeListingUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeListingUrl('nada')).toBeNull()
    expect(externalIdFromUrl('https://www.wimoveis.com.br/propriedades/apto-qr-303-2998877665.html')).toBe('2998877665')
  })
  it('candidata do Claude exige link e trecho de origem; nada é estimado', () => {
    expect(cleanCandidate({ url: '', price: 1, areaPrivate: 50 }, 'CLAUDE')).toMatchObject({ ok: false })
    expect(cleanCandidate({ url: 'https://www.olx.com.br/a-1234567', price: 250000, areaPrivate: 50 }, 'CLAUDE')).toMatchObject({ ok: false })
    expect(cleanCandidate({ url: 'https://www.olx.com.br/a-1234567', sourceText: 'Apartamento 2 quartos sem valor' }, 'CLAUDE')).toMatchObject({ ok: false })
    const ok = cleanCandidate({ url: 'https://www.olx.com.br/a-1234567?utm=1', price: 250000, areaPrivate: 50, sourceText: 'R$ 250.000 · 50 m² · 2 quartos', bedrooms: 2, photoUrl: 'http://inseguro/x.jpg' }, 'CLAUDE')
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.data.portal).toBe('OLX')
      expect(ok.data.parking).toBeNull()      // não informado fica vazio
      expect(ok.data.photoUrl).toBeNull()     // foto sem https não entra
      expect(ok.data.urlKey).toBe('olx.com.br/a-1234567')
    }
    expect(cleanCandidate({ url: 'https://corretorpaulopop.com/imoveis/x', price: 1000, areaPrivate: 50 }, 'SITE').ok).toBe(true)
  })
  it('reconhece o mesmo imóvel em outro portal', () => {
    const a = { price: 250000, areaPrivate: 50, bedrooms: 2, quadra: 'QR 303' }
    expect(looksLikeSameListing(a, { price: 250000, areaPrivate: 50, bedrooms: 2, quadra: 'qr 303' })).toBe(true)
    expect(looksLikeSameListing(a, { price: 255000, areaPrivate: 50, bedrooms: 2 })).toBe(false)
    expect(looksLikeSameListing(a, { price: 250000, areaPrivate: 50, bedrooms: 3 })).toBe(false)
    expect(looksLikeSameListing(a, { price: 250000, areaPrivate: 50, bedrooms: 2, quadra: 'QR 305' })).toBe(false)
    expect(looksLikeSameListing({ price: null, areaPrivate: 50, bedrooms: 2 }, a)).toBe(false)
  })
  it('alerta o corretor sem descartar sozinho', () => {
    const subject = { areaPrivate: 50, bedrooms: 2 }
    expect(candidateTags({ areaPrivate: 52, price: 1, daysListed: 10, bedrooms: 2 }, subject)).toEqual([])
    expect(candidateTags({ areaPrivate: 70, price: 1, daysListed: 10, bedrooms: 2 }, subject)).toEqual(['área fora da faixa pedida'])
    expect(candidateTags({ areaPrivate: 120, price: 1, daysListed: 10, bedrooms: 2 }, subject)).toEqual(['área fora da metade–dobro'])
    expect(candidateTags({ areaPrivate: 50, price: null, daysListed: 400, bedrooms: 4 }, subject)).toEqual(['sem preço', 'quartos diferentes', 'anúncio antigo'])
  })
  it('busca no site: ordena por condomínio, quadra, mesma numeração e vizinhas', () => {
    const base = QUADRAS.find(q => q.quadra === 'QN 303')!
    const plan = buildSearchPlan({ city: 'Samambaia', neighborhood: 'Samambaia Sul', condo: 'Residencial Aurora', base, quadras: QUADRAS })
    const far = [...neighborQuadras(base, QUADRAS, 999)].pop()!.quadra.quadra
    const items = [
      { key: 'longe', text: `${far} conjunto 1`, condoNames: [] },
      { key: 'irma', text: 'QR 303 Conjunto 4', condoNames: [] },
      { key: 'fora', text: 'Rua 12 Norte, Águas Claras', condoNames: [] },
      { key: 'quadra', text: 'Apartamento na QN 303 Conj. 2', condoNames: [] },
      { key: 'condo', text: 'QS 101', condoNames: ['Residencial Aurora'] },
    ]
    const r = rankSiteMatches(items, { plan, condo: 'Residencial Aurora', quadras: QUADRAS, maxDistM: 1500 })
    expect(r.map(x => x.item.key)).toEqual(['condo', 'quadra', 'irma'])
    expect(r.map(x => x.kind)).toEqual(['CONDO', 'QUADRA', 'IRMA'])
    expect(typeFamily('Apartamento')).toBe('apartamento')
    expect(typeFamily('Kitnet')).toBe('apartamento')
    expect(typeFamily('Casa em Condomínio')).toBe('casa')
  })
})

describe('v1.4 — leitor de portais e texto colado', () => {
  it('reconhece os portais aceitos', () => {
    expect(portalOf('https://www.dfimoveis.com.br/imovel/x-123456')?.slug).toBe('dfimoveis')
    expect(portalOf('https://df.olx.com.br/imoveis/apto-1234567890')?.slug).toBe('olx')
    expect(portalOf('https://www.wimoveis.com.br/propriedades/x.html')?.name).toBe('WImóveis')
    expect(portalOf('https://dfimoveis.com.br.golpe.com/x')).toBeNull()
    expect(portalOf('https://exemplo.com/x')).toBeNull()
  })
  it('lê dinheiro no formato brasileiro', () => {
    expect(parseMoney('R$ 350.000,00')).toBe(350000)
    expect(parseMoney('1.250,50')).toBe(1250.5)
    expect(parseMoney('350000')).toBe(350000)
    expect(parseMoney('sem valor')).toBeNull()
  })
  it('lê um anúncio colado como texto', () => {
    const d = parseListingText(`Apartamento 2 quartos à venda na QR 303 Conjunto 5, Samambaia Sul
R$ 250.000
Condomínio R$ 280 · IPTU R$ 450
52 m² de área útil · 1 suíte · 2 banheiros · 1 vaga
3º andar, nascente, todo reformado
Publicado em 12/08/2026
https://www.dfimoveis.com.br/imovel/apartamento-2-quartos-samambaia-998877`)
    expect(d).toMatchObject({ price: 250000, condoFee: 280, iptu: 450, usefulArea: 52, bedrooms: 2, suites: 1, bathrooms: 2, parking: 1, floor: '3', sunPosition: 'Nascente', renovation: 'Reformado', propertyType: 'Apartamento', transactionType: 'SALE', city: 'Samambaia', state: 'DF', publishedAt: '2026-08-12', portal: 'DF Imóveis', portalSlug: 'dfimoveis', externalId: '998877' })
    expect(d.address).toMatch(/^QR 303 Conjunto 5/)
    expect(d.title).toContain('Apartamento 2 quartos')
    expect(d.photoUrls).toEqual([])
  })
  it('o que o texto não traz fica vazio', () => {
    const d = parseListingText('Casa em Samambaia, 3 quartos, aceita financiamento. Tratar com Maria.')
    expect(d.price).toBeNull()
    expect(d.usefulArea).toBeNull()
    expect(d.parking).toBeNull()
    expect(d.bedrooms).toBe(3)
    expect(d.portalSlug).toBe('colado')
    expect(d.url).toBeNull()
  })
  it('não confunde condomínio e IPTU com o preço', () => {
    const t = extractFromText('Condomínio: R$ 1.200,00 IPTU: R$ 3.400 Valor: R$ 890.000 área total 120 m² área útil 98,5 m²')
    expect(t).toMatchObject({ price: 890000, condoFee: 1200, iptu: 3400, usefulArea: 98.5, totalArea: 120 })
  })
  it('lê o HTML de um portal por JSON-LD, metatags e dados embutidos', () => {
    const html = `<html><head><title>Apto</title>
<meta property="og:title" content="Apartamento 2 quartos &agrave; venda - QR 303, Samambaia Sul">
<meta property="og:description" content="Apartamento reformado com 1 vaga.">
<meta property="og:image" content="https://img.dfimoveis.com.br/fotos/1.jpg">
<script type="application/ld+json">{"@type":"Apartment","name":"Apto","floorSize":{"@type":"QuantitativeValue","value":52},"numberOfBedrooms":2,"numberOfBathroomsTotal":1,"address":{"streetAddress":"QR 303 Conjunto 5","addressLocality":"Samambaia","addressRegion":"DF"},"offers":{"price":"250000","priceCurrency":"BRL"},"image":["https://img.dfimoveis.com.br/fotos/1.jpg","https://img.dfimoveis.com.br/fotos/2.jpg","http://img.dfimoveis.com.br/fotos/inseguro.jpg","https://img.dfimoveis.com.br/logo.svg"]}</script>
</head><body><h1>Apartamento</h1><p>Condomínio R$ 280</p><script>alert(1)</script></body></html>`
    const d = parseListingHtml(html, 'https://www.dfimoveis.com.br/imovel/apartamento-2-quartos-venda-samambaia-998877?utm_source=x')
    expect(d).toMatchObject({ portal: 'DF Imóveis', portalSlug: 'dfimoveis', externalId: '998877', price: 250000, usefulArea: 52, bedrooms: 2, bathrooms: 1, parking: 1, condoFee: 280, address: 'QR 303 Conjunto 5', city: 'Samambaia', state: 'DF', propertyType: 'Apartamento', transactionType: 'SALE' })
    expect(d.photoUrls).toEqual(['https://img.dfimoveis.com.br/fotos/1.jpg', 'https://img.dfimoveis.com.br/fotos/2.jpg'])
    expect(d.filled).toContain('price')
  })
  it('lê dados no formato VivaReal/ZAP e OLX', () => {
    const viva = `<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"listing":{"usableAreas":["60"],"bedrooms":[3],"bathrooms":[2],"parkingSpaces":[1],"pricingInfos":[{"price":"320000","monthlyCondoFee":"350"}],"address":{"neighborhood":"Samambaia Norte","city":"Brasília","stateAcronym":"DF"}}}}}</script>`
    const a = parseListingHtml(viva, 'https://www.vivareal.com.br/imovel/apartamento-3-quartos-samambaia-norte-60m2-venda-id-2711223344/')
    expect(a).toMatchObject({ price: 320000, usefulArea: 60, bedrooms: 3, bathrooms: 2, parking: 1, condoFee: 350, neighborhood: 'Samambaia Norte', transactionType: 'SALE' })
    const olx = `<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"ad":{"priceValue":"R$ 185.000","properties":[{"name":"size","label":"Área útil","value":"48m²"},{"name":"rooms","label":"Quartos","value":"2"},{"name":"garage_spaces","label":"Vagas na garagem","value":"1"}],"images":[{"original":"https://img.olx.com.br/images/1.jpg"}]}}}}</script>`
    const b = parseListingHtml(olx, 'https://df.olx.com.br/distrito-federal-e-regiao/imoveis/apartamento-qr-303-1345678901')
    expect(b).toMatchObject({ portal: 'OLX', price: 185000, usefulArea: 48, bedrooms: 2, parking: 1 })
    expect(b.photoUrls).toEqual(['https://img.olx.com.br/images/1.jpg'])
  })
  it('adivinha tipo, negócio e cidade só quando o texto diz', () => {
    expect(guessType('Kitnet mobiliada')).toBe('Kitnet')
    expect(guessType('Excelente oportunidade')).toBeNull()
    expect(guessTransaction('Apto para alugar')).toBe('RENT')
    expect(guessTransaction('Apto', 'https://x.com.br/venda/apto')).toBe('SALE')
    expect(guessTransaction('Apto')).toBeNull()
    expect(guessCity('QNL 10 Taguatinga Norte')).toBe('Taguatinga')
    expect(guessCity('Rua A')).toBeNull()
    expect(cleanPhotoUrls(['https://a.com/1.jpg', 'https://a.com/1.jpg', 'ftp://a.com/2.jpg', 'https://a.com/icon-logo.png'])).toEqual(['https://a.com/1.jpg'])
  })
  it('limpa o rascunho vindo da tela ou do conector', () => {
    const d = sanitizeDraft({ url: 'https://www.olx.com.br/imoveis/apto-1345678901?utm=1', portalSlug: 'olx', externalId: '1345678901', title: '<b>Apto</b> QR 303', description: 'Linha 1\n<img src=x onerror=alert(1)>Linha 2', price: 250000, usefulArea: 'abc', bedrooms: 2.4, transactionType: 'QUALQUER', photoUrls: ['https://img.olx.com.br/1.jpg', 'javascript:alert(1)'], features: ['Piscina', 'Piscina', ''] } as never)
    expect(d.title).toBe('Apto QR 303')
    expect(d.description).toBe('Linha 1\nLinha 2')   // texto puro com quebra de linha, sem HTML
    expect(d).toMatchObject({ price: 250000, usefulArea: null, bedrooms: 2, transactionType: null, photoUrls: ['https://img.olx.com.br/1.jpg'], features: ['Piscina'] })
    expect(sourceIdOf(d)).toBe('olx:1345678901')
    expect(sourceIdOf({ ...d, url: null })).toBeNull()
  })
  it('portal e código vêm do endereço, nunca do que a tela ou o conector informam', () => {
    const forged = sanitizeDraft({ url: 'https://www.olx.com.br/imoveis/apto-1345678901', portalSlug: 'remax', portal: 'RE/MAX', externalId: '999', title: 'x', price: '450.000' } as never)
    expect(forged).toMatchObject({ portalSlug: 'olx', portal: 'OLX', externalId: '1345678901', price: 450000 })
    expect(sourceIdOf(forged)).toBe('olx:1345678901')
    expect(sanitizeDraft({ title: 'Sem link', portalSlug: 'remax' } as never).portalSlug).toBe('colado')
  })
  it('números no formato brasileiro', () => {
    expect(parseNumberBR('450.000')).toBe(450000)
    expect(parseNumberBR('1.250,50')).toBe(1250.5)
    expect(parseNumberBR('52,5')).toBe(52.5)
    expect(parseNumberBR('52.5')).toBe(52.5)
    expect(parseNumberBR('R$ 250.000')).toBe(250000)
    expect(parseNumberBR('52 m²')).toBe(52)
    expect(parseNumberBR(3)).toBe(3)
    expect(parseNumberBR('abc')).toBeNull()
    expect(parseNumberBR('')).toBeNull()
    const c = cleanCandidate({ url: 'https://www.olx.com.br/a-1234567', price: '450.000' as never, areaPrivate: '52,5' as never, sourceText: 'R$ 450.000 · 52,5 m²' }, 'CLAUDE')
    expect(c.ok && c.data.price).toBe(450000)
    expect(c.ok && c.data.areaPrivate).toBe(52.5)
  })
  it('endereço malformado e página hostil não derrubam nem travam a leitura', () => {
    expect(normalizeListingUrl('https://www.olx.com.br/imovel/50%-desconto-123456')?.urlKey).toBe('olx.com.br/imovel/50%-desconto-123456')
    const a = normalizeListingUrl('https://portal.com.br/detalhe?imovel_id=10&utm_source=x'), b = normalizeListingUrl('https://portal.com.br/detalhe?imovel_id=11')
    expect(a?.urlKey).not.toBe(b?.urlKey)
    const t0 = Date.now()
    expect(htmlToText('<script '.repeat(60_000))).toBe('')
    expect(htmlToText('<'.repeat(300_000)).length).toBeGreaterThan(0)
    expect(parseListingText('<'.repeat(400_000)).price).toBeNull()
    parseListingHtml('<script '.repeat(80_000) + '<meta property="og:title" content="x">', 'https://www.olx.com.br/a-1234567')
    expect(Date.now() - t0).toBeLessThan(1500)
    expect(htmlToText('<p>Pre&#231;o &#99999999; ok</p><style>p{}</style><script>var a = "<b>"</script>fim')).toBe('Preço &#99999999; ok\nfim')
  })
  it('status público (ativo, vendido, alugado) exige a confirmação de autorização', () => {
    expect(['ACTIVE', 'SOLD', 'RENTED'].every(isPublicStatus)).toBe(true)
    expect(['DRAFT', 'INACTIVE', 'SUSPENDED', undefined, 1].some(isPublicStatus)).toBe(false)
  })
})

describe('v1.4 — leitura segura de endereços externos', () => {
  it('bloqueia rede interna, IP literal e http', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.10', '172.20.0.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:10.0.0.1']) expect(isPrivateAddress(ip)).toBe(true)
    expect(isPrivateAddress('200.160.2.3')).toBe(false)
    for (const u of ['http://dfimoveis.com.br/x', 'https://127.0.0.1/x', 'https://localhost/x', 'https://user:pw@dfimoveis.com.br/x', 'https://dfimoveis.com.br:8443/x', 'https://servidor.internal/x', 'file:///etc/passwd'])
      expect(() => assertPublicHttpsUrl(u)).toThrow(UnsafeUrlError)
    expect(assertPublicHttpsUrl('https://www.dfimoveis.com.br/imovel/x').hostname).toBe('www.dfimoveis.com.br')
    expect(hostAllowed('img.olx.com.br', ['olx.com.br'])).toBe(true)
    expect(hostAllowed('olx.com.br.golpe.com', ['olx.com.br'])).toBe(false)
  })
})

describe('v1.4 — conector do Claude (MCP)', () => {
  const tools: ToolDef<{ who: string }>[] = [
    { name: 'eco', title: 'Eco', description: 'Devolve o que recebeu', readOnly: true, inputSchema: { type: 'object', properties: { texto: { type: 'string' } } }, handler: async (a, c) => ({ texto: a.texto, de: c.who }) },
    { name: 'falha', title: 'Falha', description: 'Erro de uso', readOnly: false, inputSchema: { type: 'object' }, handler: async () => { throw new ToolError('Informe o estudo_id.') } },
    { name: 'quebra', title: 'Quebra', description: 'Erro interno', readOnly: false, inputSchema: { type: 'object' }, handler: async () => { throw new Error('segredo do banco') } },
  ]
  const ctx = { who: 'paulo' }
  it('initialize negocia a versão e anuncia as ferramentas', async () => {
    const r = await handleRpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'claude', version: '1' } } }, tools, ctx) as { result: Record<string, unknown> }
    expect(r.result.protocolVersion).toBe('2025-03-26')
    expect(r.result.capabilities).toEqual({ tools: { listChanged: false } })
    expect(String(r.result.instructions)).toContain('buscar_no_site')
    const other = await handleRpc({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } }, tools, ctx) as { result: Record<string, unknown> }
    expect(other.result.protocolVersion).toBe(PROTOCOL_VERSIONS[0])
  })
  it('tools/list descreve as ferramentas com esquema e marcações', async () => {
    const r = await handleRpc({ jsonrpc: '2.0', id: 'a', method: 'tools/list' }, tools, ctx) as { id: string; result: { tools: Array<Record<string, unknown>> } }
    expect(r.id).toBe('a')
    expect(r.result.tools.map(t => t.name)).toEqual(['eco', 'falha', 'quebra'])
    expect(r.result.tools[0]).toMatchObject({ inputSchema: { type: 'object' }, annotations: { readOnlyHint: true, destructiveHint: false } })
  })
  it('tools/call devolve o resultado; erro de uso volta legível; erro interno não vaza detalhes', async () => {
    const ok = await handleRpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'eco', arguments: { texto: 'oi' } } }, tools, ctx) as { result: { content: Array<{ text: string }>; isError: boolean } }
    expect(ok.result.isError).toBe(false)
    expect(JSON.parse(ok.result.content[0].text)).toEqual({ texto: 'oi', de: 'paulo' })
    const bad = await handleRpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'falha' } }, tools, ctx) as { result: { content: Array<{ text: string }>; isError: boolean } }
    expect(bad.result).toMatchObject({ isError: true, content: [{ type: 'text', text: 'Informe o estudo_id.' }] })
    const boom = await handleRpc({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'quebra' } }, tools, ctx) as { result: { content: Array<{ text: string }>; isError: boolean } }
    expect(boom.result.isError).toBe(true)
    expect(boom.result.content[0].text).not.toContain('segredo')
    const unknown = await handleRpc({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'apagar_tudo' } }, tools, ctx) as { error: { code: number } }
    expect(unknown.error.code).toBe(-32602)
  })
  it('notificações não têm resposta; método desconhecido e mensagem inválida dão erro', async () => {
    expect(await handleRpc({ jsonrpc: '2.0', method: 'notifications/initialized' }, tools, ctx)).toBeNull()
    expect(await handleRpc({ jsonrpc: '2.0', id: 7, method: 'ping' }, tools, ctx)).toEqual({ jsonrpc: '2.0', id: 7, result: {} })
    expect(await handleRpc({ jsonrpc: '2.0', id: 8, method: 'inexistente' }, tools, ctx)).toMatchObject({ error: { code: -32601 } })
    expect(await handleRpc('texto', tools, ctx)).toMatchObject({ error: { code: -32600 } })
    expect(await handleRpc({ id: 9, method: 'ping' }, tools, ctx)).toMatchObject({ error: { code: -32600 } })
    const batch = await handleBody([{ jsonrpc: '2.0', id: 1, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/initialized' }], tools, ctx)
    expect(batch).toEqual([{ jsonrpc: '2.0', id: 1, result: {} }])
    expect(await handleBody([{ jsonrpc: '2.0', method: 'notifications/initialized' }], tools, ctx)).toBeNull()
    expect(await handleBody([], tools, ctx)).toMatchObject({ error: { code: -32600 } })
  })
  it('token: formato, hash e leitura do cabeçalho', () => {
    const t = generateToken()
    expect(looksLikeToken(t.token)).toBe(true)
    expect(t.hash).toBe(hashToken(t.token))
    expect(t.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(t.hash).not.toContain(t.token.slice(4, 20))
    expect(t.prefix).toBe(t.token.slice(0, 10))
    expect(generateToken().token).not.toBe(t.token)
    expect(looksLikeToken('ppk_curto')).toBe(false)
    expect(looksLikeToken("ppk_' OR 1=1 --aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(false)
    expect(bearerFrom(`Bearer ${t.token}`)).toBe(t.token)
    expect(bearerFrom('Basic abc')).toBeNull()
    expect(bearerFrom(null)).toBeNull()
  })
})

describe('v1.4 — rota do mapa estático (blocos simulados, sem rede)', () => {
  it('monta o PNG no tamanho pedido e responde 502 quando o serviço de mapas falha', async () => {
    const { vi } = await import('vitest')
    const sharp = (await import('sharp')).default
    const { NextRequest } = await import('next/server')
    const tilePng = await sharp({ create: { width: 256, height: 256, channels: 3, background: '#88aa88' } }).png().toBuffer()
    const calls: string[] = []
    vi.stubGlobal('fetch', async (url: string) => { calls.push(String(url)); return new Response(new Uint8Array(tilePng), { status: 200, headers: { 'content-type': 'image/png' } }) })
    try {
      const { GET } = await import('@/app/api/mapa-estatico/route')
      const res = await GET(new NextRequest('http://localhost/api/mapa-estatico?lat=-15.879&lng=-48.087&w=1000&h=420&z=16'))
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe('image/png')
      const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata()
      expect([meta.width, meta.height]).toEqual([1000, 420])
      expect(calls.length).toBeGreaterThanOrEqual(8)
      expect(calls.every(u => /^https:\/\/tile\.openstreetmap\.org\/16\/\d+\/\d+\.png$/.test(u))).toBe(true)
      expect((await GET(new NextRequest('http://localhost/api/mapa-estatico?lat=0&lng=0'))).status).toBe(400)
      vi.stubGlobal('fetch', async () => { throw new Error('sem rede') })
      expect((await GET(new NextRequest('http://localhost/api/mapa-estatico?lat=-10.5&lng=-40.5&z=12'))).status).toBe(502)
    } finally { vi.unstubAllGlobals() }
  })
})
