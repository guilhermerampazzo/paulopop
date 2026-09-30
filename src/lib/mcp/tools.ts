/**
 * v1.4 — Ferramentas do conector do Claude.
 *
 * O conector pesquisa e registra; quem decide é o corretor:
 *  - nunca aprova amostra, nunca publica anúncio e nunca apaga nada;
 *  - recusar amostra só por ordem do corretor, com o motivo;
 *  - anúncio importado entra sempre como rascunho, sem copiar fotos (a cópia exige a confirmação de autorização no painel).
 */
import { prisma } from '@/lib/prisma'
import { ADMIN_ROLES } from '@/lib/authz'
import { SITE_URL } from '@/lib/site'
import { computeStudy } from '@/lib/market-study'
import { recomputeStudy } from '@/lib/market-study-db'
import { searchContext, quadrasOf, ensureSeedLoaded, type StudyForSearch } from '@/lib/intel/db'
import { matchQuadra, neighborQuadras, sisterQuadras, nextSearchStep, defaultSearchTerms, PRIORITY_PORTALS, OTHER_PORTALS } from '@/lib/intel/quadras'
import { registerCandidates, rejectSample, sampleCounts, type CandidateInput } from '@/lib/intel/candidates'
import { searchOwnSite, STUDY_SEARCH_SELECT } from '@/lib/intel/site-search'
import { parseListingText, portalOf, type ListingDraft } from '@/lib/portal-reader/parse'
import { readListingFromUrl, PortalReadError } from '@/lib/portal-reader/read'
import { createDraftFromListing, sanitizeDraft } from '@/lib/portal-reader/import'
import { ToolError, type ToolDef } from './server'
import type { McpUser } from './auth'

export interface McpCtx { user: McpUser }

const isAdmin = (u: McpUser) => ADMIN_ROLES.includes(u.role)

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v))
const str = (v: unknown, max = 300) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
/** número como veio (número ou texto curto "450.000"); a limpeza da candidata interpreta o formato brasileiro */
const asNum = (v: unknown): number | null => (typeof v === 'number' ? v : typeof v === 'string' && v.length <= 30 ? (v as unknown as number) : null)
const round2 = (v: number | null) => (v == null ? null : Math.round(v * 100) / 100)
const SITUACAO: Record<string, string> = { NONE: 'sem pedido de pesquisa', REQUESTED: 'pesquisa pedida pelo corretor', RUNNING: 'pesquisa em andamento', DONE: 'pesquisa concluída' }
const AMOSTRA: Record<string, string> = { CANDIDATE: 'candidata (aguarda o corretor)', APPROVED: 'aprovada', REJECTED: 'recusada' }

async function studyFor(ctx: McpCtx, id: unknown) {
  const studyId = str(id, 60)
  if (!studyId) throw new ToolError('Informe o estudo_id (use listar_estudos para ver os estudos).')
  const study = await prisma.marketStudy.findUnique({ where: { id: studyId }, select: STUDY_SEARCH_SELECT })
  if (!study || (!isAdmin(ctx.user) && study.agentId !== ctx.user.id)) throw new ToolError('Estudo não encontrado para este corretor. Use listar_estudos.')
  return study
}

const idSchema = { estudo_id: { type: 'string', description: 'Identificador do estudo (vem de listar_estudos).' } }

function filtersFor(study: { areaPrivate: unknown; bedrooms: number | null }, p: { areaTolPct?: number | null; bedroomsTol?: number | null; maxAdDays?: number | null }) {
  const area = n(study.areaPrivate)
  const tol = p.areaTolPct ?? 30
  const bt = p.bedroomsTol ?? 1
  return {
    area_min_m2: area ? Math.round(area * (1 - tol / 100)) : null,
    area_max_m2: area ? Math.round(area * (1 + tol / 100)) : null,
    quartos_min: study.bedrooms != null ? Math.max(0, study.bedrooms - bt) : null,
    quartos_max: study.bedrooms != null ? study.bedrooms + bt : null,
    idade_max_do_anuncio_dias: p.maxAdDays ?? 180,
  }
}

/** Passo atual da busca, em palavras do corretor. */
async function stepView(study: Awaited<ReturnType<typeof studyFor>>, advance: boolean) {
  const ctx = await searchContext(study as StudyForSearch)
  const counts = await sampleCounts(study.id)
  const next = nextSearchStep({ plan: ctx.plan, cursor: ctx.cursor, have: counts.have, target: study.targetSamples, advance, priorityPortals: ctx.params.portals, otherPortals: ctx.params.otherPortals })
  const city = (study.city ?? ctx.intelCity ?? '').replace(/\s*-\s*DF$/i, '').trim()
  const tipo = (study.propertyType ?? 'imóvel').toLowerCase()
  const negocio = study.transactionType === 'RENT' ? 'aluguel' : 'venda'
  const view = next.done
    ? {
      concluido: true,
      motivo: next.reason === 'META_ATINGIDA' ? 'O estudo já tem o número de amostras pedido (aprovadas + candidatas). Pare a busca e avise o corretor para conferir as candidatas.' : 'A ordem de busca acabou (todas as quadras e portais). Avise o corretor: faltam amostras e ele decide se amplia a região ou a tolerância.',
      faltam: next.missing, tem: counts,
    }
    : {
      concluido: false,
      passo: {
        numero_na_ordem_do_corretor: next.step!.passo, tipo: next.step!.kind, descricao: next.step!.label, quadra: next.step!.quadra,
        distancia_aproximada_m: next.step!.distM, termos_de_busca: next.step!.terms,
      },
      passo_id: `${next.cursor.tier}:${next.cursor.index}`,
      portais_da_vez: next.portals,
      consultas_sugeridas: next.step!.kind === 'SITE' ? [] : next.step!.terms.slice(0, 3).map(t => `${tipo} ${negocio} ${t}${t.toLowerCase().includes(city.toLowerCase()) ? '' : ` ${city}`}`.trim()),
      filtros: filtersFor(study, ctx.params),
      faltam: next.missing, tem: counts, posicao: `passo ${next.position.atual} de ${next.position.total}${ctx.cursor.tier === 1 || next.cursor.tier === 1 ? ' (segunda rodada: demais portais)' : ''}`,
      como_prosseguir: next.step!.kind === 'SITE'
        ? 'Chame buscar_no_site. A busca sempre começa pelo site do corretor.'
        : 'Pesquise esta quadra nos portais da vez, leia os anúncios que servem, chame registrar_candidatas e depois registrar_busca. Em seguida chame proxima_quadra com concluir_atual=true e passo_concluido igual a este passo_id.',
    }
  return { ctx, counts, next, view }
}

export const TOOLS: ToolDef<McpCtx>[] = [
  {
    name: 'listar_estudos', title: 'Listar estudos de mercado', readOnly: true,
    description: 'Lista os estudos de mercado do corretor. Por padrão mostra os que estão pedindo pesquisa de amostras ou com pesquisa em andamento.',
    inputSchema: { type: 'object', properties: { situacao: { type: 'string', enum: ['pedindo_pesquisa', 'todos'], description: 'pedindo_pesquisa (padrão) ou todos.' }, limite: { type: 'integer', minimum: 1, maximum: 50 } }, additionalProperties: false },
    async handler(args, ctx) {
      const all = args.situacao === 'todos'
      const take = Math.min(50, Math.max(1, Number(args.limite) || 20))
      const scope = isAdmin(ctx.user) ? {} : { agentId: ctx.user.id }
      let rows = await prisma.marketStudy.findMany({ where: { ...scope, ...(all ? {} : { searchStatus: { in: ['REQUESTED', 'RUNNING'] } }) }, orderBy: { updatedAt: 'desc' }, take, select: { id: true, title: true, address: true, city: true, status: true, searchStatus: true, targetSamples: true, updatedAt: true } })
      let note: string | null = null
      if (!rows.length && !all) {
        rows = await prisma.marketStudy.findMany({ where: { ...scope, status: 'DRAFT' }, orderBy: { updatedAt: 'desc' }, take: 10, select: { id: true, title: true, address: true, city: true, status: true, searchStatus: true, targetSamples: true, updatedAt: true } })
        note = 'Nenhum estudo está pedindo pesquisa. Abaixo, os rascunhos mais recentes — confirme com o corretor qual deles pesquisar.'
      }
      const out = []
      for (const r of rows) {
        const c = await sampleCounts(r.id)
        out.push({ estudo_id: r.id, titulo: r.title, endereco: r.address, cidade: r.city, situacao_da_pesquisa: SITUACAO[r.searchStatus] ?? r.searchStatus, meta_de_amostras: r.targetSamples, aprovadas: c.approved, candidatas: c.candidates, recusadas: c.rejected, atualizado_em: r.updatedAt.toISOString().slice(0, 10), painel: `${SITE_URL}/admin/estudos/${r.id}` })
      }
      return { aviso: note, estudos: out }
    },
  },
  {
    name: 'ler_estudo', title: 'Ler estudo de mercado', readOnly: true,
    description: 'Devolve os dados do imóvel avaliando, os parâmetros e regras de pesquisa definidos pelo corretor, as amostras já no estudo (aprovadas, candidatas e recusadas com o motivo) e o próximo passo da busca. Leia antes de pesquisar.',
    inputSchema: { type: 'object', properties: idSchema, required: ['estudo_id'], additionalProperties: false },
    async handler(args, ctx) {
      const base = await studyFor(ctx, args.estudo_id)
      const study = await prisma.marketStudy.findUnique({ where: { id: base.id }, include: { samples: { orderBy: { order: 'asc' } } } })
      if (!study) throw new ToolError('Estudo não encontrado.')
      const { ctx: sc, view } = await stepView(base, false)
      const notes = sc.intelCity && sc.base?.series != null
        ? await prisma.intelRegionNote.findMany({ where: { city: sc.intelCity, series: { has: sc.base.series } }, select: { name: true, confirmed: true, market: true } })
        : []
      return {
        estudo_id: study.id, titulo: study.title, situacao_da_pesquisa: SITUACAO[study.searchStatus] ?? study.searchStatus,
        imovel_avaliando: {
          endereco: study.address, bairro: study.neighborhood, cidade: study.city, tipo: study.propertyType, negocio: study.transactionType === 'RENT' ? 'aluguel' : 'venda',
          area_privativa_m2: n(study.areaPrivate), area_total_m2: n(study.areaTotal), quartos: study.bedrooms, suites: study.suites, banheiros: study.bathrooms, vagas: study.parking,
          andar: study.floor, andares_do_predio: study.buildingFloors, elevador: study.elevator, posicao_do_sol: study.sunPosition, condicao: study.condition, reforma: study.renovation, idade_anos: study.age,
          condominio_mensal: n(study.condoFee), lazer: study.leisure,
        },
        pesquisa: {
          meta_de_amostras: study.targetSamples, quadra_do_imovel: sc.base?.quadra ?? null, condominio: sc.condo, base_de_quadras: sc.intelCity ?? 'sem base de quadras para esta cidade (a busca vai por bairro e cidade)',
          portais_prioritarios: sc.params.portals?.length ? sc.params.portals : [...PRIORITY_PORTALS], outros_portais: sc.params.otherPortals ?? [...OTHER_PORTALS],
          raio_km: n(study.radiusKm), filtros: filtersFor(study, sc.params), regras_do_corretor: sc.params.rules ?? null,
        },
        amostras: study.samples.map(s => ({
          amostra_id: s.id, situacao: AMOSTRA[s.candidateStatus] ?? s.candidateStatus, portal: s.portal, link: s.url, outros_links: s.altUrls, local: s.location, quadra: s.foundAtQuadra,
          preco: n(s.price), area_privativa_m2: n(s.areaPrivate), preco_m2: s.price && s.areaPrivate ? round2(Number(s.price) / Number(s.areaPrivate)) : null, quartos: s.bedrooms,
          ...(s.candidateStatus === 'REJECTED' ? { motivo_da_recusa: s.rejectedReason ?? s.discardReason } : {}),
        })),
        observacoes_da_regiao: notes.map(r => ({ regiao: r.name, confirmado: r.confirmed, mercado: r.market })),
        proximo_passo: view,
        regras: [
          'Não registre de novo um link que já está na lista de amostras (inclusive os recusados).',
          'Amostra recusada mostra o que o corretor não quer: evite anúncios com o mesmo problema.',
          'Campo que o anúncio não mostra fica vazio. Nunca estime preço, área ou quartos.',
        ],
      }
    },
  },
  {
    name: 'buscar_no_site', title: 'Buscar no site do corretor (passo 1)', readOnly: false,
    description: 'Primeiro passo de toda pesquisa: procura comparáveis entre os anúncios do corretorpaulopop.com (ativos e vendidos) e no banco de amostras de estudos anteriores, e registra o que servir como candidata. Chame sempre antes de ir aos portais.',
    inputSchema: { type: 'object', properties: idSchema, required: ['estudo_id'], additionalProperties: false },
    async handler(args, ctx) {
      const study = await studyFor(ctx, args.estudo_id)
      const r = await searchOwnSite(study.id, 'MCP')
      const counts = await sampleCounts(study.id)
      return { mensagem: r.message, encontrados: r.found, registradas: r.registered, resultados: r.results.map(x => ({ link: x.url, resultado: x.result, motivo: x.reason, amostra_id: x.sampleId, preco_m2: x.pricePerSqm, alertas: x.tags })), tem: counts, faltam: Math.max(0, study.targetSamples - counts.have), proximo: 'Chame proxima_quadra para saber onde pesquisar nos portais.' }
    },
  },
  {
    name: 'proxima_quadra', title: 'Próximo passo da busca (quadra a quadra)', readOnly: false,
    description: 'Diz onde pesquisar agora: mesmo condomínio, a quadra do imóvel, as de mesma numeração, as vizinhas da mais próxima para a mais distante, depois bairro e cidade — e em quais portais (WImóveis, DF Imóveis e OLX primeiro; os demais só se faltar amostra). Passe concluir_atual=true depois de terminar a quadra atual para avançar. Devolve concluido=true quando a meta foi atingida ou a ordem acabou.',
    inputSchema: { type: 'object', properties: { ...idSchema, concluir_atual: { type: 'boolean', description: 'true = a quadra/passo atual já foi pesquisada em todos os portais da vez; avança para o próximo.' }, passo_concluido: { type: 'string', description: 'O passo_id devolvido na resposta anterior. Informe junto com concluir_atual: se a chamada for repetida, o mesmo passo não é pulado duas vezes.' } }, required: ['estudo_id'], additionalProperties: false },
    async handler(args, ctx) {
      const study = await studyFor(ctx, args.estudo_id)
      let advance = args.concluir_atual === true
      if (advance && typeof args.passo_concluido === 'string') {
        // repetição da mesma chamada (rede, nova tentativa): só avança se o passo informado ainda é o atual
        const now = await searchContext(study as StudyForSearch)
        if (args.passo_concluido !== `${now.cursor.tier}:${now.cursor.index}`) advance = false
      }
      const { next, view } = await stepView(study, advance)
      await prisma.marketStudy.update({ where: { id: study.id }, data: { ...(advance ? { searchCursor: next.cursor as never } : {}), searchStatus: next.done ? (next.reason === 'META_ATINGIDA' ? 'DONE' : 'RUNNING') : 'RUNNING' } })
      return view
    },
  },
  {
    name: 'consultar_quadras', title: 'Consultar a base de endereços (Área de Inteligência)', readOnly: true,
    description: 'Consulta a base de quadras (hoje: Samambaia/DF, 350 quadras). Informe uma quadra ou um endereço para receber os termos de busca, as quadras de mesma numeração (QR/QN/QS), as vizinhas mais próximas e as observações da região. Sem parâmetros, devolve o resumo da base.',
    inputSchema: { type: 'object', properties: { quadra: { type: 'string', description: 'Ex.: "QR 303" ou um endereço que contenha a quadra.' }, cidade: { type: 'string' }, vizinhas: { type: 'integer', minimum: 1, maximum: 30 } }, additionalProperties: false },
    async handler(args) {
      await ensureSeedLoaded()
      const cities = (await prisma.intelQuadra.groupBy({ by: ['city'], _count: { _all: true } })).map(c => ({ cidade: c.city, quadras: c._count._all }))
      const city = str(args.cidade, 80) ?? cities[0]?.cidade
      const text = str(args.quadra, 200)
      if (!text || !city) return { base: cities, como_usar: 'Informe "quadra" (ex.: QR 303) para ver termos de busca, mesma numeração e vizinhas.' }
      const match = cities.find(c => c.cidade.toLowerCase() === city.toLowerCase())?.cidade
      if (!match) throw new ToolError(`Não há base de quadras para "${city}". Cidades na base: ${cities.map(c => c.cidade).join(', ') || 'nenhuma'}.`)
      const quadras = await quadrasOf(match)
      const base = quadras.find(q => q.quadra.toLowerCase() === text.toLowerCase()) ?? matchQuadra(text, quadras)
      if (!base) throw new ToolError(`Quadra não encontrada na base de ${match}: "${text}". Confira a sigla e o número (ex.: QR 303, QN 303, QS 303).`)
      const notes = base.series != null ? await prisma.intelRegionNote.findMany({ where: { city: match, series: { has: base.series } }, select: { name: true, confirmed: true, market: true } }) : []
      const terms = (q: typeof base) => (q.searchTerms?.length ? q.searchTerms : defaultSearchTerms(q))
      return {
        quadra: base.quadra, cidade: base.city, setor: base.sector, serie: base.series, termos_de_busca: terms(base),
        mesma_numeracao: sisterQuadras(base, quadras).map(q => ({ quadra: q.quadra, termos_de_busca: terms(q) })),
        vizinhas: neighborQuadras(base, quadras, Math.min(30, Math.max(1, Number(args.vizinhas) || 12))).map(x => ({ quadra: x.quadra.quadra, distancia_aproximada_m: x.distM })),
        observacoes_da_regiao: notes.map(r => ({ regiao: r.name, confirmado: r.confirmed, mercado: r.market })),
        aviso: 'Distâncias aproximadas, medidas no mapa oficial da RA XII. Servem para ordenar a busca, não para laudo.',
      }
    },
  },
  {
    name: 'registrar_candidatas', title: 'Registrar candidatas a amostra', readOnly: false,
    description: 'Registra no estudo os anúncios lidos nos portais como candidatas (até 40 por chamada). Cada uma precisa do link e do trecho do anúncio de onde saíram preço e área. As candidatas NÃO entram no cálculo: o corretor aprova ou recusa no painel. Link repetido é ignorado; o mesmo imóvel em outro portal é juntado à amostra existente.',
    inputSchema: {
      type: 'object', required: ['estudo_id', 'candidatas'], additionalProperties: false,
      properties: {
        ...idSchema,
        candidatas: {
          type: 'array', minItems: 1, maxItems: 40,
          items: {
            type: 'object', required: ['link', 'trecho_origem'], additionalProperties: false,
            properties: {
              link: { type: 'string', description: 'Endereço completo do anúncio (https://…).' },
              trecho_origem: { type: 'string', description: 'Texto copiado do anúncio que mostra preço e área (prova da leitura).' },
              portal: { type: 'string' }, titulo: { type: 'string' }, anunciante: { type: 'string' }, local: { type: 'string', description: 'Endereço/quadra como aparece no anúncio.' },
              quadra: { type: 'string', description: 'Quadra identificada (ex.: QR 303).' }, bairro: { type: 'string' }, cidade: { type: 'string' },
              preco: { type: 'number' }, area_privativa: { type: 'number', description: 'Área privativa/útil em m².' }, area_total: { type: 'number' },
              quartos: { type: 'integer' }, suites: { type: 'integer' }, banheiros: { type: 'integer' }, vagas: { type: 'integer' }, andar: { type: 'string' },
              condominio_valor: { type: 'number' }, publicado_em: { type: 'string', description: 'Data do anúncio (AAAA-MM-DD), se o portal mostrar.' }, dias_anunciado: { type: 'integer' },
              foto: { type: 'string', description: 'Endereço https da foto principal.' }, mesmo_condominio: { type: 'boolean' }, observacao: { type: 'string' },
            },
          },
        },
      },
    },
    async handler(args, ctx) {
      const study = await studyFor(ctx, args.estudo_id)
      const list = Array.isArray(args.candidatas) ? args.candidatas : []
      if (!list.length) throw new ToolError('Envie ao menos uma candidata.')
      const items: CandidateInput[] = list.slice(0, 40).map(raw => {
        const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
        return {
          url: String(c.link ?? ''), sourceText: str(c.trecho_origem, 1500), portal: str(c.portal, 40), title: str(c.titulo, 200), advertiser: str(c.anunciante, 200), location: str(c.local, 200),
          quadra: str(c.quadra, 40), neighborhood: str(c.bairro, 80), city: str(c.cidade, 80), price: asNum(c.preco), areaPrivate: asNum(c.area_privativa), areaTotal: asNum(c.area_total),
          bedrooms: asNum(c.quartos), suites: asNum(c.suites), bathrooms: asNum(c.banheiros), parking: asNum(c.vagas), floor: str(c.andar, 40), condoFee: asNum(c.condominio_valor),
          publishedAt: str(c.publicado_em, 30), daysListed: asNum(c.dias_anunciado), photoUrl: str(c.foto, 1000), sameCondo: c.mesmo_condominio === true, notes: str(c.observacao, 1000),
        }
      })
      const sc = await searchContext(study as StudyForSearch)
      const step = sc.plan[sc.cursor.index]
      const r = await registerCandidates(study.id, items, { origin: 'CLAUDE', step: step?.kind ?? null, quadra: step?.quadra ?? null, areaTolPct: sc.params.areaTolPct, bedroomsTol: sc.params.bedroomsTol, maxAdDays: sc.params.maxAdDays })
      const counts = await sampleCounts(study.id)
      return {
        registradas: r.registered,
        resultados: r.results.map(x => ({ link: x.url, resultado: x.result, motivo: x.reason, amostra_id: x.sampleId, preco_m2: x.pricePerSqm, alertas: x.tags })),
        tem: counts, faltam: Math.max(0, study.targetSamples - counts.have),
        lembrete: 'As candidatas aguardam o corretor no painel (aba Pesquisa). Registre a busca com registrar_busca.',
      }
    },
  },
  {
    name: 'registrar_busca', title: 'Registrar a busca feita', readOnly: false,
    description: 'Guarda no histórico do estudo o que foi pesquisado (portal, quadra, consulta, quantos anúncios apareceram, quantos foram lidos e quantos viraram candidatas). Chame uma vez por portal pesquisado, mesmo quando nada serviu — o corretor vê onde já se procurou.',
    inputSchema: { type: 'object', required: ['estudo_id', 'portal'], additionalProperties: false, properties: { ...idSchema, portal: { type: 'string' }, quadra: { type: 'string' }, consulta: { type: 'string', description: 'Texto ou filtros usados na busca.' }, encontrados: { type: 'integer' }, lidos: { type: 'integer' }, registrados: { type: 'integer' }, observacao: { type: 'string' } } },
    async handler(args, ctx) {
      const study = await studyFor(ctx, args.estudo_id)
      const sc = await searchContext(study as StudyForSearch)
      const step = sc.plan[sc.cursor.index]
      const cnt = (v: unknown) => Math.min(100000, Math.max(0, Math.round(Number(v) || 0)))
      const run = await prisma.studySearchRun.create({
        data: { studyId: study.id, source: 'MCP', step: step?.kind ?? null, quadra: str(args.quadra, 40) ?? step?.quadra ?? null, portal: str(args.portal, 40), query: str(args.consulta, 300), found: cnt(args.encontrados), read: cnt(args.lidos), registered: cnt(args.registrados), notes: str(args.observacao, 1000) },
        select: { id: true },
      })
      return { ok: true, busca_id: run.id }
    },
  },
  {
    name: 'recusar_amostra', title: 'Recusar amostra (por ordem do corretor)', readOnly: false,
    description: 'Marca uma amostra ou candidata como recusada, com o motivo. Use SOMENTE quando o corretor disser, na conversa, que aquela amostra não serve. A amostra sai do cálculo (não é apagada) e a busca é reaberta para completar a meta.',
    inputSchema: { type: 'object', required: ['estudo_id', 'amostra_id', 'motivo'], additionalProperties: false, properties: { ...idSchema, amostra_id: { type: 'string' }, motivo: { type: 'string', description: 'O motivo dito pelo corretor.' } } },
    async handler(args, ctx) {
      const study = await studyFor(ctx, args.estudo_id)
      const r = await rejectSample(study.id, str(args.amostra_id, 60) ?? '', str(args.motivo, 600) ?? '')
      if (!r.ok) throw new ToolError(r.reason ?? 'Não foi possível recusar a amostra.')
      await recomputeStudy(study.id)
      const counts = await sampleCounts(study.id)
      return { ok: true, tem: counts, faltam: Math.max(0, study.targetSamples - counts.have), proximo: 'A busca foi reaberta. Chame proxima_quadra para continuar do ponto em que parou.' }
    },
  },
  {
    name: 'resumo_calculo', title: 'Resumo do cálculo do estudo', readOnly: true,
    description: 'Mostra o cálculo atual do estudo (só com as amostras aprovadas pelo corretor): quantidade, média e mediana do R$/m², coeficiente de variação e valores sugeridos. Mostra também uma prévia de como ficaria se todas as candidatas fossem aprovadas — apenas para orientar, não é resultado.',
    inputSchema: { type: 'object', properties: idSchema, required: ['estudo_id'], additionalProperties: false },
    async handler(args, ctx) {
      const base = await studyFor(ctx, args.estudo_id)
      const study = await prisma.marketStudy.findUnique({ where: { id: base.id }, include: { samples: { orderBy: { order: 'asc' } } } })
      if (!study) throw new ToolError('Estudo não encontrado.')
      const opts = { competitivePct: n(study.competitivePct) ?? 15, optimisticPct: n(study.optimisticPct) ?? 10, outlierPct: n(study.outlierPct) ?? 30, scenario: study.scenario, adjustPct: n(study.adjustPct) }
      const input = study.samples.map(s => ({ id: s.id, price: n(s.price), areaPrivate: n(s.areaPrivate), status: s.status, daysListed: s.daysListed, publishedAt: s.publishedAt, candidateStatus: s.candidateStatus }))
      const now = computeStudy(input, { areaPrivate: n(study.areaPrivate) }, opts)
      const preview = computeStudy(input.filter(s => s.candidateStatus !== 'REJECTED').map(s => ({ ...s, candidateStatus: 'APPROVED' })), { areaPrivate: n(study.areaPrivate) }, opts)
      const pack = (r: typeof now) => ({ amostras_validas: r.nValid, media_m2: r.mean, mediana_m2: r.median, menor_m2: r.min, maior_m2: r.max, coeficiente_de_variacao_pct: r.cv, valor_de_mercado: r.values.market, valor_competitivo: r.values.competitive, valor_otimista: r.values.optimistic, valor_sugerido: r.suggested })
      const alerts: string[] = []
      if (now.nValid < 3) alerts.push('Menos de 3 amostras aprovadas: o estudo ainda não se sustenta.')
      if (now.cv != null && now.cv > 30) alerts.push('Coeficiente de variação acima de 30%: amostras muito diferentes entre si.')
      if (!n(study.areaPrivate)) alerts.push('O imóvel avaliando está sem área privativa: não há valor sugerido.')
      return {
        metodo: 'Comparativo direto de dados de mercado: média do R$/m² (área privativa) das amostras aprovadas × área privativa do imóvel.',
        area_privativa_m2: n(study.areaPrivate), resultado_atual: pack(now),
        previa_se_todas_as_candidatas_fossem_aprovadas: pack(preview),
        alertas: alerts,
        aviso: 'O resultado oficial é o do painel, depois da conferência do corretor. A prévia não deve ser apresentada ao cliente.',
      }
    },
  },
  {
    name: 'importar_anuncio', title: 'Criar rascunho de anúncio a partir de um portal', readOnly: false,
    description: 'Cria no site um RASCUNHO de imóvel a partir de um anúncio de portal (DF Imóveis, WImóveis, OLX e outros) ou de um texto. Informe o link e, de preferência, os campos já lidos por você (o portal pode bloquear a leitura pelo servidor). O rascunho não fica público e as fotos não são copiadas: publicar exige que o corretor confirme, no painel, que o anúncio é dele ou que tem autorização escrita do proprietário.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        link: { type: 'string', description: 'Endereço do anúncio (https://…).' }, texto: { type: 'string', description: 'Texto do anúncio, quando não houver link ou o portal bloquear.' },
        titulo: { type: 'string' }, tipo: { type: 'string', description: 'Apartamento, Casa, Kitnet, Terreno, Sala Comercial, Loja…' }, negocio: { type: 'string', enum: ['venda', 'aluguel'] },
        preco: { type: 'number' }, condominio_valor: { type: 'number' }, iptu: { type: 'number' }, area_util: { type: 'number' }, area_total: { type: 'number' },
        quartos: { type: 'integer' }, suites: { type: 'integer' }, banheiros: { type: 'integer' }, vagas: { type: 'integer' }, andar: { type: 'string' },
        endereco: { type: 'string' }, bairro: { type: 'string' }, cidade: { type: 'string' }, descricao: { type: 'string' }, anunciante: { type: 'string' },
        caracteristicas: { type: 'array', items: { type: 'string' }, maxItems: 60 }, fotos: { type: 'array', items: { type: 'string' }, maxItems: 30, description: 'Endereços https das fotos do anúncio (ficam guardados; não são copiados sem autorização).' },
      },
    },
    async handler(args, ctx) {
      const link = str(args.link, 1000)
      const texto = str(args.texto, 20000)
      const hasFields = ['titulo', 'preco', 'area_util', 'area_total'].some(k => args[k] !== undefined && args[k] !== null && args[k] !== '')
      if (!link && !texto && !hasFields) throw new ToolError('Informe o link do anúncio, o texto ou os campos lidos.')
      if (portalOf(link)?.slug === 'remax') throw new ToolError('Anúncio da RE/MAX: o corretor importa pelo painel (Imóveis → Importar anúncio → RE/MAX), que traz todos os campos. O conector não importa RE/MAX.')
      let base: Partial<ListingDraft> = {}
      if (texto) base = parseListingText(texto, link)
      else if (link && !hasFields) {
        try { base = await readListingFromUrl(link) } catch (e) {
          if (e instanceof PortalReadError) throw new ToolError(`${e.message} Leia o anúncio você mesmo e chame de novo com os campos (titulo, preco, area_util, quartos, endereco, descricao, fotos).`)
          throw e
        }
      } else if (link) base = parseListingText('', link)
      const over: Record<string, unknown> = {
        title: str(args.titulo, 200), propertyType: str(args.tipo, 40), transactionType: args.negocio === 'aluguel' ? 'RENT' : args.negocio === 'venda' ? 'SALE' : undefined,
        price: asNum(args.preco), condoFee: asNum(args.condominio_valor), iptu: asNum(args.iptu), usefulArea: asNum(args.area_util), totalArea: asNum(args.area_total),
        bedrooms: asNum(args.quartos), suites: asNum(args.suites), bathrooms: asNum(args.banheiros), parking: asNum(args.vagas), floor: str(args.andar, 20),
        address: str(args.endereco, 200), neighborhood: str(args.bairro, 80), city: str(args.cidade, 80), description: str(args.descricao, 8000), advertiser: str(args.anunciante, 200),
        features: Array.isArray(args.caracteristicas) ? args.caracteristicas : undefined, photoUrls: Array.isArray(args.fotos) ? args.fotos : undefined,
      }
      const merged = { ...base, ...Object.fromEntries(Object.entries(over).filter(([, v]) => v !== null && v !== undefined)) } as Partial<ListingDraft> & Record<string, unknown>
      if (link && !merged.url) merged.url = link
      let draft
      try { draft = sanitizeDraft(merged) } catch { throw new ToolError('Dados do anúncio inválidos. Confira o link e os campos.') }
      let r
      try { r = await createDraftFromListing(draft, { agentId: ctx.user.id, authConfirmed: false, via: 'CONECTOR', isAdmin: isAdmin(ctx.user) }) } catch (e) {
        throw new ToolError(e instanceof Error ? e.message : 'Não foi possível criar o rascunho.')
      }
      return {
        criado: r.created, imovel_id: r.id, referencia: r.ref, situacao: 'RASCUNHO (não está público)', fotos_guardadas_como_endereco: r.imagesPending, avisos: r.warnings,
        painel: `${SITE_URL}/admin/imoveis/${r.id}`,
        proximo: 'Avise o corretor: ele confere os dados no painel e só publica depois de confirmar que o anúncio é dele ou que tem autorização escrita do proprietário.',
      }
    },
  },
]
