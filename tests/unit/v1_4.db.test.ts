/**
 * v1.4 — testes com banco de verdade (rodam só quando DATABASE_URL está definido):
 * base de quadras, candidatas e banco de amostras, busca no próprio site, conector do Claude ponta a ponta
 * e importador (rascunho sem fotos até a autorização). Nenhuma chamada de rede.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const hasDb = !!process.env.DATABASE_URL
const TAG = `t14-${Date.now()}`
// cidade só deste teste, com a sua própria base de quadras: o resultado não depende do que já existe no banco
const CITY = `Testopolis ${TAG}`

describe.skipIf(!hasDb)('v1.4 com banco', () => {
  let prisma: typeof import('@/lib/prisma').prisma
  let intel: typeof import('@/lib/intel/db')
  let cand: typeof import('@/lib/intel/candidates')
  let site: typeof import('@/lib/intel/site-search')
  let db: typeof import('@/lib/market-study-db')
  let mcp: typeof import('@/lib/mcp/server')
  let auth: typeof import('@/lib/mcp/auth')
  let tools: typeof import('@/lib/mcp/tools')
  let imp: typeof import('@/lib/portal-reader/import')
  let agentId: string, otherId: string, studyId: string, token: string, otherToken: string
  const propIds: string[] = []

  const call = async (tk: string, name: string, args: Record<string, unknown>) => {
    const user = await auth.authenticateToken(tk)
    if (!user) throw new Error('token inválido')
    const r = await mcp.handleRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, tools.TOOLS, { user }) as { result: { content: Array<{ text: string }>; isError: boolean } }
    return { isError: r.result.isError, text: r.result.content[0].text, data: r.result.isError ? null : JSON.parse(r.result.content[0].text) }
  }

  beforeAll(async () => {
    ;({ prisma } = await import('@/lib/prisma'))
    intel = await import('@/lib/intel/db')
    cand = await import('@/lib/intel/candidates')
    site = await import('@/lib/intel/site-search')
    db = await import('@/lib/market-study-db')
    mcp = await import('@/lib/mcp/server')
    auth = await import('@/lib/mcp/auth')
    tools = await import('@/lib/mcp/tools')
    imp = await import('@/lib/portal-reader/import')

    const agent = await prisma.user.create({ data: { email: `${TAG}-a@paulopop.local`, name: 'Corretor Teste 1.4', password: 'x', role: 'AGENT' } })
    const other = await prisma.user.create({ data: { email: `${TAG}-b@paulopop.local`, name: 'Outro Corretor', password: 'x', role: 'AGENT' } })
    agentId = agent.id; otherId = other.id
    const t1 = auth.generateToken(), t2 = auth.generateToken()
    token = t1.token; otherToken = t2.token
    await prisma.apiToken.create({ data: { userId: agentId, name: 'teste', tokenHash: t1.hash, prefix: t1.prefix } })
    await prisma.apiToken.create({ data: { userId: otherId, name: 'teste', tokenHash: t2.hash, prefix: t2.prefix } })

    await prisma.intelQuadra.createMany({ data: ([['QN 303', 'QN', 303, 0], ['QR 303', 'QR', 303, 100], ['QS 303', 'QS', 303, 200], ['QR 305', 'QR', 305, 400], ['QN 305', 'QN', 305, 500], ['QR 508', 'QR', 508, 3000]] as Array<[string, string, number, number]>).map(([quadra, prefix, number, x]) => ({ city: CITY, quadra, prefix, number, series: Math.floor(number / 100) * 100, mapX: x, mapY: 0, searchTerms: [quadra] })) })
    await prisma.intelRegionNote.create({ data: { city: CITY, name: 'Setor de teste', series: [300], confirmed: 'Região de teste.' } })

    const mk = async (ref: string, data: Record<string, unknown>) => {
      const p = await prisma.property.create({ data: { ref: `${TAG}-${ref}`, slug: `${TAG}-${ref}`, agentId, transactionType: 'SALE', propertyType: 'Apartamento', city: CITY, neighborhood: 'Setor Sul', status: 'ACTIVE', ...data } as never })
      propIds.push(p.id); return p
    }
    const subject = await mk('subj', { title: 'Apto QN 303 avaliando', address: 'QN 303 Conjunto 1', price: 240000, usefulArea: 50, bedrooms: 2 })
    await mk('mesma', { title: 'Apartamento 2 quartos', address: 'QN 303 Conjunto 3 Lote 2', price: 250000, usefulArea: 50, bedrooms: 2 })
    await mk('irma', { title: 'Apartamento QR 303', address: 'QR 303 Conjunto 8', price: 230000, usefulArea: 46, bedrooms: 2, status: 'SOLD', salePrice: 225000, showSalePrice: true, soldAt: new Date('2026-05-10') })
    await mk('sigilo', { title: 'Apartamento QS 303', address: 'QS 303 Conjunto 1', price: 236000, usefulArea: 48, bedrooms: 2, status: 'SOLD', salePrice: 199000, showSalePrice: false, soldAt: new Date('2026-06-02') })
    await mk('casa', { title: 'Casa QN 303', address: 'QN 303 Conjunto 9', price: 480000, usefulArea: 120, bedrooms: 3, propertyType: 'Casa' })
    await mk('oculto', { title: 'Apto oculto QN 303', address: 'QN 303 Conjunto 4', price: 255000, usefulArea: 50, bedrooms: 2, hideOnSite: true })
    await mk('rascunho', { title: 'Apto rascunho QN 303', address: 'QN 303 Conjunto 5', price: 255000, usefulArea: 50, bedrooms: 2, status: 'DRAFT' })

    const study = await prisma.marketStudy.create({
      data: { agentId, propertyId: subject.id, title: `${TAG} Apto QN 303`, address: 'QN 303 Conjunto 1 Lote 4, Apto 201', neighborhood: 'Setor Sul', city: CITY, propertyType: 'Apartamento', transactionType: 'SALE', areaPrivate: 50, bedrooms: 2, targetSamples: 9 },
    })
    studyId = study.id
  })

  afterAll(async () => {
    if (!prisma) return
    await prisma.marketStudy.deleteMany({ where: { agentId: { in: [agentId, otherId] } } })
    await prisma.sampleBankItem.deleteMany({ where: { url: { contains: TAG } } })
    await prisma.activity.deleteMany({ where: { userId: { in: [agentId, otherId] } } })
    await prisma.property.deleteMany({ where: { agentId: { in: [agentId, otherId] } } })
    await prisma.user.deleteMany({ where: { id: { in: [agentId, otherId] } } })
    await prisma.intelQuadra.deleteMany({ where: { city: CITY } })
    await prisma.intelRegionNote.deleteMany({ where: { city: CITY } })
  })

  it('carrega a base de Samambaia uma única vez e identifica a quadra do estudo', async () => {
    await intel.ensureSeedLoaded()
    expect((await intel.ensureSeedLoaded()).loaded).toBe(0)
    expect(await prisma.intelQuadra.count({ where: { city: 'Samambaia' } })).toBe(350)
    expect(await prisma.intelRegionNote.count({ where: { city: 'Samambaia' } })).toBe(11)
    const study = await prisma.marketStudy.findUniqueOrThrow({ where: { id: studyId }, select: site.STUDY_SEARCH_SELECT })
    const ctx = await intel.searchContext(study as never)
    expect(ctx.intelCity).toBe(CITY)
    expect(ctx.base?.quadra).toBe('QN 303')
    expect(ctx.plan.slice(0, 4).map(s => s.kind)).toEqual(['SITE', 'QUADRA', 'IRMA', 'IRMA'])
  })

  it('conector: token vale para o dono, não para outro corretor, e morre ao revogar', async () => {
    expect((await auth.authenticateToken(token))?.id).toBe(agentId)
    expect(await auth.authenticateToken('ppk_' + 'a'.repeat(43))).toBeNull()
    expect(await auth.authenticateToken(null)).toBeNull()
    const lista = await call(token, 'listar_estudos', { situacao: 'todos' })
    expect(lista.data.estudos.map((e: { estudo_id: string }) => e.estudo_id)).toContain(studyId)
    const alheio = await call(otherToken, 'ler_estudo', { estudo_id: studyId })
    expect(alheio.isError).toBe(true)
    expect((await call(otherToken, 'listar_estudos', { situacao: 'todos' })).data.estudos).toEqual([])
    const stored = await prisma.apiToken.findFirstOrThrow({ where: { userId: agentId } })
    expect(stored.tokenHash).not.toContain(token.slice(4))
    expect(stored.lastUsedAt).not.toBeNull()
  })

  it('conector: ler_estudo mostra imóvel, filtros e o primeiro passo (site)', async () => {
    const r = await call(token, 'ler_estudo', { estudo_id: studyId })
    expect(r.isError).toBe(false)
    expect(r.data.imovel_avaliando).toMatchObject({ area_privativa_m2: 50, quartos: 2, negocio: 'venda' })
    expect(r.data.pesquisa).toMatchObject({ meta_de_amostras: 9, quadra_do_imovel: 'QN 303', portais_prioritarios: ['WImóveis', 'DF Imóveis', 'OLX'] })
    expect(r.data.pesquisa.filtros).toMatchObject({ area_min_m2: 35, area_max_m2: 65, quartos_min: 1, quartos_max: 3 })
    expect(r.data.proximo_passo.passo.tipo).toBe('SITE')
    expect(r.data.observacoes_da_regiao.length).toBeGreaterThan(0)
  })

  it('passo 1: busca no próprio site registra só o que serve e avança a ordem', async () => {
    const r = await call(token, 'buscar_no_site', { estudo_id: studyId })
    expect(r.isError).toBe(false)
    expect(r.data.registradas).toBe(3)
    const samples = await prisma.marketStudySample.findMany({ where: { studyId }, orderBy: { order: 'asc' } })
    expect(samples.map(s => s.origin)).toEqual(['SITE', 'SITE', 'SITE'])
    expect(samples.map(s => s.candidateStatus)).toEqual(['CANDIDATE', 'CANDIDATE', 'CANDIDATE'])
    expect(samples.map(s => s.foundAtQuadra)).toEqual(['QN 303', 'QR 303', 'QS 303'])   // mesma quadra antes das de mesma numeração
    // vendido com "mostrar valor final" desligado: entra o valor do anúncio, nunca o de fechamento
    expect(Number(samples[2].price)).toBe(236000)
    expect(`${samples[2].notes} ${samples[2].sourceText}`).not.toContain('199')
    expect(samples[2].notes).toContain('não divulgado')
    expect(samples.every(s => s.url?.includes('/imoveis/'))).toBe(true)
    expect(samples.map(s => s.url).join(' ')).not.toMatch(/subj|casa|oculto|rascunho/)   // o próprio imóvel, outro tipo, oculto e rascunho ficam fora
    expect(Number(samples[1].price)).toBe(225000)                                   // vendido: valor de fechamento
    expect(samples[1].notes).toContain('Vendido')
    const st = await prisma.marketStudy.findUniqueOrThrow({ where: { id: studyId } })
    expect((st.searchCursor as { index: number }).index).toBe(1)
    expect(st.searchStatus).toBe('RUNNING')
    expect(await prisma.studySearchRun.count({ where: { studyId, step: 'SITE', source: 'MCP' } })).toBe(1)
    // rodar de novo não duplica
    const again = await site.searchOwnSite(studyId, 'PANEL')
    expect(again.registered).toBe(0)
    expect(await prisma.marketStudySample.count({ where: { studyId } })).toBe(3)
    expect(again.message).toContain('já estão neste estudo')
  })

  it('candidatas não entram no cálculo até o corretor aprovar', async () => {
    const before = await db.recomputeStudy(studyId)
    expect(before?.nValid).toBe(0)
    const resumo = await call(token, 'resumo_calculo', { estudo_id: studyId })
    expect(resumo.data.resultado_atual.amostras_validas).toBe(0)
    expect(resumo.data.previa_se_todas_as_candidatas_fossem_aprovadas.amostras_validas).toBe(3)
    expect(resumo.data.alertas.join(' ')).toContain('Menos de 3')
  })

  it('conector: próxima quadra → registrar candidatas → registrar busca', async () => {
    const step = await call(token, 'proxima_quadra', { estudo_id: studyId })
    expect(step.data).toMatchObject({ concluido: false, faltam: 6, passo_id: '0:1', portais_da_vez: ['WImóveis', 'DF Imóveis', 'OLX'] })
    expect(step.data.passo).toMatchObject({ tipo: 'QUADRA', quadra: 'QN 303' })
    expect(step.data.consultas_sugeridas[0]).toContain('QN 303')
    expect(step.data.consultas_sugeridas[0]).toContain('Testopolis')

    const reg = await call(token, 'registrar_candidatas', {
      estudo_id: studyId,
      candidatas: [
        { link: `https://www.dfimoveis.com.br/imovel/${TAG}-apto-qn-303-1111111?utm_source=x`, trecho_origem: 'Apartamento 2 quartos QN 303 · R$ 260.000 · 52 m² úteis', preco: 260000, area_privativa: 52, quartos: 2, local: 'QN 303 Conjunto 6', quadra: 'QN 303', publicado_em: '2026-08-01' },
        { link: `https://www.wimoveis.com.br/propriedades/${TAG}-apto-qn-303-2222222.html`, trecho_origem: 'Apto QN 303, 2 quartos, 52m², R$ 260.000', preco: 260000, area_privativa: 52, quartos: 2, quadra: 'QN 303' },
        { link: `https://www.olx.com.br/imoveis/${TAG}-sem-trecho-3333333`, preco: 200000, area_privativa: 45 },
        { link: `https://www.olx.com.br/imoveis/${TAG}-grande-4444444`, trecho_origem: 'Cobertura duplex 130 m² R$ 520.000', preco: 520000, area_privativa: 130, quartos: 4 },
      ],
    })
    expect(reg.isError).toBe(false)
    expect(reg.data.resultados.map((x: { resultado: string }) => x.resultado)).toEqual(['registrada', 'mesclada', 'ignorada', 'registrada'])
    expect(reg.data.resultados[0].preco_m2).toBe(5000)
    expect(reg.data.resultados[3].alertas).toEqual(['área fora da metade–dobro', 'quartos diferentes'])
    expect(reg.data.tem).toMatchObject({ approved: 0, candidates: 5 })

    // o mesmo link de novo (com outro parâmetro de rastreio) atualiza a candidata, sem duplicar
    const dup = await call(token, 'registrar_candidatas', { estudo_id: studyId, candidatas: [{ link: `https://dfimoveis.com.br/imovel/${TAG}-apto-qn-303-1111111/?utm_campaign=y`, trecho_origem: 'Apartamento 2 quartos QN 303 · R$ 255.000 · 52 m² úteis', preco: 255000, area_privativa: 52, quartos: 2 }] })
    expect(dup.data.resultados[0].resultado).toBe('atualizada')
    expect(await prisma.marketStudySample.count({ where: { studyId } })).toBe(5)
    // registrar de novo pelo link do outro portal (já juntado) não troca o link principal da amostra
    const alt = await call(token, 'registrar_candidatas', { estudo_id: studyId, candidatas: [{ link: `https://www.wimoveis.com.br/propriedades/${TAG}-apto-qn-303-2222222.html`, trecho_origem: 'Apto QN 303, 2 quartos, 52m², R$ 255.000', preco: 255000, area_privativa: 52 }] })
    expect(alt.data.resultados[0].resultado).toBe('mesclada')
    const merged = await prisma.marketStudySample.findFirstOrThrow({ where: { studyId, url: { contains: '1111111' } } })
    expect(merged.altUrls.length).toBe(1)
    expect(merged.origin).toBe('CLAUDE')
    expect(merged.sourceText).toContain('255.000')
    expect(merged.collectedAt).not.toBeNull()
    const bank = await prisma.sampleBankItem.findFirstOrThrow({ where: { url: { contains: `${TAG}-apto-qn-303-1111111` } } })
    expect((bank.priceHistory as unknown[]).length).toBe(2)   // 260 mil → 255 mil: histórico de preço

    const run = await call(token, 'registrar_busca', { estudo_id: studyId, portal: 'DF Imóveis', consulta: 'apartamento venda QN 303 Samambaia', encontrados: 14, lidos: 5, registrados: 1 })
    expect(run.data.ok).toBe(true)
    const saved = await prisma.studySearchRun.findFirstOrThrow({ where: { studyId, portal: 'DF Imóveis' } })
    expect(saved).toMatchObject({ found: 14, read: 5, registered: 1, quadra: 'QN 303', source: 'MCP' })

    const next = await call(token, 'proxima_quadra', { estudo_id: studyId, concluir_atual: true, passo_concluido: '0:1' })
    expect(next.data.passo.quadra).toBe('QR 303')
    expect(next.data.passo_id).toBe('0:2')
    // a mesma chamada repetida (nova tentativa) não pula outra quadra
    const retry = await call(token, 'proxima_quadra', { estudo_id: studyId, concluir_atual: true, passo_concluido: '0:1' })
    expect(retry.data.passo.quadra).toBe('QR 303')
    // número em texto no formato brasileiro não vira 450
    const br = await call(token, 'registrar_candidatas', { estudo_id: studyId, candidatas: [{ link: `https://www.olx.com.br/imoveis/${TAG}-texto-5555555`, trecho_origem: 'Apto QR 303 R$ 251.000 50 m²', preco: '251.000', area_privativa: '50' }] })
    expect(br.data.resultados[0]).toMatchObject({ resultado: 'registrada', preco_m2: 5020 })
    // um link malformado no lote não derruba os outros
    const bad = await call(token, 'registrar_candidatas', { estudo_id: studyId, candidatas: [{ link: `https://www.olx.com.br/imoveis/${TAG}-50%-off-6666666`, trecho_origem: 'Apto QR 303 R$ 249.000 50 m²', preco: 249000, area_privativa: 50 }, { link: 'isto não é link', trecho_origem: 'xxxxxxxxxxxxxxxxxxxx', preco: 1000, area_privativa: 50 }] })
    expect(bad.isError).toBe(false)
    expect(bad.data.resultados.map((x: { resultado: string }) => x.resultado)).toEqual(['registrada', 'ignorada'])
  })

  it('aprovar coloca no cálculo; recusar tira, guarda o motivo e reabre a busca', async () => {
    const all = await prisma.marketStudySample.findMany({ where: { studyId }, orderBy: { order: 'asc' } })
    const big = all.find(s => s.url?.includes('4444444'))!
    const keep = all.filter(s => s.id !== big.id)
    await prisma.marketStudySample.updateMany({ where: { id: { in: keep.map(s => s.id) } }, data: { candidateStatus: 'APPROVED' } })
    const r = await db.recomputeStudy(studyId)
    expect(r?.nValid).toBe(6)
    expect(r?.samples.length).toBe(6)

    const semMotivo = await call(token, 'recusar_amostra', { estudo_id: studyId, amostra_id: big.id, motivo: '  ' })
    expect(semMotivo.isError).toBe(true)
    const rej = await call(token, 'recusar_amostra', { estudo_id: studyId, amostra_id: big.id, motivo: 'Cobertura duplex: outro padrão' })
    expect(rej.data).toMatchObject({ ok: true, faltam: 3 })
    const after = await prisma.marketStudySample.findUniqueOrThrow({ where: { id: big.id } })
    expect(after).toMatchObject({ candidateStatus: 'REJECTED', status: 'DISCARDED', rejectedReason: 'Cobertura duplex: outro padrão' })
    expect((await prisma.marketStudy.findUniqueOrThrow({ where: { id: studyId } })).searchStatus).toBe('REQUESTED')
    // o link recusado não volta
    const back = await call(token, 'registrar_candidatas', { estudo_id: studyId, candidatas: [{ link: big.url, trecho_origem: 'Cobertura duplex 130 m² R$ 520.000', preco: 520000, area_privativa: 130 }] })
    expect(back.data.resultados[0]).toMatchObject({ resultado: 'ignorada' })
    expect(back.data.resultados[0].motivo).toContain('recusado')
    // relatório público: só aprovadas
    const pub = await db.loadStudy(studyId, { approvedOnly: true })
    expect(pub?.samples.length).toBe(6)
    expect((await db.loadStudy(studyId))?.samples.length).toBe(7)
    // amostra sem área não conta para a meta (não pode entrar no cálculo)
    await prisma.marketStudySample.create({ data: { studyId, order: 99, url: `https://www.olx.com.br/imoveis/${TAG}-sem-area-8888888`, price: 250000, candidateStatus: 'CANDIDATE', origin: 'CLAUDE' } })
    expect(await cand.sampleCounts(studyId)).toMatchObject({ approved: 6, candidates: 1, rejected: 1, have: 6 })
    // outro corretor não recusa amostra alheia
    expect((await call(otherToken, 'recusar_amostra', { estudo_id: studyId, amostra_id: keep[0].id, motivo: 'x' })).isError).toBe(true)
  })

  it('corrigir o endereço do imóvel recomeça a ordem de busca na quadra nova', async () => {
    const sel = () => prisma.marketStudy.findUniqueOrThrow({ where: { id: studyId }, select: site.STUDY_SEARCH_SELECT })
    const before = await intel.searchContext(await sel() as never)
    expect(before.cursor.index).toBe(2)
    expect(before.cursor.key).toBe('QN 303|')
    await prisma.marketStudy.update({ where: { id: studyId }, data: { address: 'QR 508 Conjunto 2 Lote 1' } })
    const after = await intel.searchContext(await sel() as never)
    expect(after.base?.quadra).toBe('QR 508')
    expect(after.cursor).toMatchObject({ tier: 0, index: 0, done: [], key: 'QR 508|' })
    await prisma.marketStudy.update({ where: { id: studyId }, data: { address: 'QN 303 Conjunto 1 Lote 4, Apto 201' } })
  })

  it('depois de recusas, a busca no site traz os anúncios seguintes em vez de repetir os mesmos', async () => {
    const other = await prisma.marketStudy.create({ data: { agentId, title: `${TAG} segundo`, address: 'QN 303 Conjunto 2', neighborhood: 'Setor Sul', city: CITY, propertyType: 'Apartamento', transactionType: 'SALE', areaPrivate: 50, bedrooms: 2, targetSamples: 3 } })
    const first = await site.searchOwnSite(other.id, 'PANEL')
    expect(first.registered).toBeGreaterThanOrEqual(4)     // site (subj, mesma, irma, sigilo) + banco de amostras
    const firstUrls = (await prisma.marketStudySample.findMany({ where: { studyId: other.id } })).map(s => s.url)
    for (const s of await prisma.marketStudySample.findMany({ where: { studyId: other.id } })) await cand.rejectSample(other.id, s.id, 'não serve')
    const bankBefore = await prisma.sampleBankItem.count({ where: { url: { contains: TAG } } })
    await prisma.sampleBankItem.create({ data: { urlKey: `olx.com.br/imoveis/${TAG}-novo-9999999`, url: `https://www.olx.com.br/imoveis/${TAG}-novo-9999999`, portal: 'OLX', location: 'QN 303 Conjunto 8', quadra: 'QN 303', city: CITY, price: 247000, areaPrivate: 50, bedrooms: 2 } })
    const second = await site.searchOwnSite(other.id, 'PANEL')
    expect(second.registered).toBeGreaterThanOrEqual(1)
    const now = (await prisma.marketStudySample.findMany({ where: { studyId: other.id, candidateStatus: 'CANDIDATE' } })).map(s => s.url)
    expect(now).toContain(`https://www.olx.com.br/imoveis/${TAG}-novo-9999999`)
    expect(now.some(u => firstUrls.includes(u))).toBe(false)      // nenhum dos recusados voltou
    expect(now.length).toBe(second.registered)
    expect(bankBefore).toBeGreaterThan(0)
  })

  it('meta atingida encerra a busca', async () => {
    await prisma.marketStudy.update({ where: { id: studyId }, data: { targetSamples: 3 } })
    const r = await call(token, 'proxima_quadra', { estudo_id: studyId })
    expect(r.data.concluido).toBe(true)
    expect(r.data.motivo).toContain('número de amostras pedido')
    expect((await prisma.marketStudy.findUniqueOrThrow({ where: { id: studyId } })).searchStatus).toBe('DONE')
  })

  it('consultar_quadras devolve termos, mesma numeração e vizinhas', async () => {
    const r = await call(token, 'consultar_quadras', { quadra: 'QN 303', cidade: 'Samambaia' })
    expect(r.data).toMatchObject({ quadra: 'QN 303', cidade: 'Samambaia' })
    expect(r.data.mesma_numeracao.map((q: { quadra: string }) => q.quadra)).toEqual(['QR 303', 'QS 303'])
    expect(r.data.vizinhas.length).toBe(12)
    expect((await call(token, 'consultar_quadras', { quadra: 'QX 999', cidade: 'Samambaia' })).isError).toBe(true)
    expect((await call(token, 'consultar_quadras', {})).data.base).toContainEqual({ cidade: 'Samambaia', quadras: 350 })
  })

  it('importar_anuncio cria rascunho, sem fotos copiadas e sem autorização', async () => {
    const link = `https://www.dfimoveis.com.br/imovel/${TAG}-apartamento-2-quartos-7777777`
    const r = await call(token, 'importar_anuncio', { link, titulo: 'Apartamento 2 quartos QR 303', tipo: 'Apartamento', negocio: 'venda', preco: 250000, area_util: 50, quartos: 2, vagas: 1, endereco: 'QR 303 Conjunto 5', bairro: 'Samambaia Sul', cidade: 'Samambaia', descricao: 'Reformado.\nPerto do metrô.', fotos: ['https://img.dfimoveis.com.br/f/1.jpg', 'https://img.dfimoveis.com.br/f/2.jpg'] })
    expect(r.isError).toBe(false)
    expect(r.data).toMatchObject({ criado: true, fotos_guardadas_como_endereco: 2 })
    const p = await prisma.property.findUniqueOrThrow({ where: { id: r.data.imovel_id }, include: { images: true } })
    expect(p).toMatchObject({ status: 'DRAFT', sourcePortal: 'dfimoveis', sourceId: 'dfimoveis:7777777', agentId, publishAuthConfirmedAt: null, city: 'Samambaia', state: 'DF', bedrooms: 2, totalParkingSpots: 1 })
    expect(Number(p.pricePerSqm)).toBe(5000)
    expect(p.images.length).toBe(0)
    expect(p.sourcePhotoUrls.length).toBe(2)
    expect(p.slug).toMatch(/^apartamento-venda-samambaia-sul-/)
    // o mesmo anúncio de novo não duplica
    const again = await call(token, 'importar_anuncio', { link, titulo: 'Outro título', preco: 1 })
    expect(again.data).toMatchObject({ criado: false, imovel_id: p.id })
    expect(await prisma.property.count({ where: { sourceId: 'dfimoveis:7777777' } })).toBe(1)
    // sem dados não cria
    expect((await call(token, 'importar_anuncio', {})).isError).toBe(true)
    // RE/MAX não entra pelo conector (teria outra regra de publicação)
    const remax = await call(token, 'importar_anuncio', { link: 'https://www.remax.com.br/pt-br/imoveis/apartamento/venda/samambaia/880221062-99', titulo: 'x', preco: 300000 })
    expect(remax.isError).toBe(true)
    expect(await prisma.property.count({ where: { sourcePortal: 'remax', agentId } })).toBe(0)
    // outro corretor não recebe os dados do cadastro já importado
    const outro = await call(otherToken, 'importar_anuncio', { link, titulo: 'x', preco: 250000 })
    expect(outro.isError).toBe(true)
    expect(outro.text).not.toContain(p.id)
  })

  it('texto colado vira rascunho com os campos lidos', async () => {
    const { parseListingText } = await import('@/lib/portal-reader/parse')
    const draft = imp.sanitizeDraft(parseListingText('Kitnet para alugar QS 101 Samambaia Sul\nR$ 900\n28 m² úteis\n1 banheiro') as never)
    const r = await imp.createDraftFromListing(draft, { agentId, authConfirmed: false, via: 'PAINEL' })
    const p = await prisma.property.findUniqueOrThrow({ where: { id: r.id } })
    expect(p).toMatchObject({ status: 'DRAFT', transactionType: 'RENT', propertyType: 'Kitnet', sourcePortal: 'colado', sourceId: null, sourceUrl: null })
    expect(Number(p.price)).toBe(900)
    expect(Number(p.usefulArea)).toBe(28)
  })
})
