/**
 * v1.4 — leitura de um anúncio de portal pelo servidor (só portais da lista, com proteção contra SSRF).
 */
import { safeFetch, UnsafeUrlError } from '@/lib/net/safe-fetch'
import { parseListingHtml, portalOf, PORTAL_HOST_SUFFIXES, type ListingDraft } from './parse'

export class PortalReadError extends Error {
  constructor(message: string, public blocked = false, public status = 502) { super(message) }
}

export const PORTAL_NAMES = 'DF Imóveis, WImóveis, OLX, VivaReal, ZAP, Imovelweb e Chaves na Mão'

/** Lê o anúncio no portal. Lança PortalReadError com mensagem pronta para o corretor. */
export async function readListingFromUrl(url: string, opts: { anyHost?: boolean } = {}): Promise<ListingDraft> {
  if (!/^https:\/\//i.test(String(url ?? ''))) throw new PortalReadError('Cole o link completo do anúncio (https://…).', false, 400)
  // anyHost: amostra de estudo pode vir do site de uma imobiliária (a leitura continua protegida contra endereços internos)
  if (!opts.anyHost && !portalOf(url)) throw new PortalReadError(`Este link não é de um portal aceito (${PORTAL_NAMES}). Use a opção "Colar texto".`, false, 400)
  let res
  try {
    res = await safeFetch(url, { allowedHostSuffixes: opts.anyHost ? undefined : PORTAL_HOST_SUFFIXES, maxBytes: 4 * 1024 * 1024, timeoutMs: 15000 })
  } catch (e) {
    if (e instanceof UnsafeUrlError) throw new PortalReadError(e.message, false, 400)
    throw new PortalReadError('Não foi possível abrir o anúncio agora (o portal não respondeu). Tente de novo ou use "Colar texto".', true)
  }
  if (res.status === 403 || res.status === 429 || res.status === 503) throw new PortalReadError('O portal bloqueou a leitura automática deste anúncio. Abra o anúncio, copie o texto e use "Colar texto" — ou peça ao Claude para ler pelo conector.', true)
  if (res.status === 404 || res.status === 410) throw new PortalReadError('O portal informou que este anúncio não existe mais.', false, 404)
  if (res.status >= 400) throw new PortalReadError(`O portal respondeu ${res.status}. Tente de novo mais tarde ou use "Colar texto".`, true)
  const html = res.body.toString('utf8')
  const draft = parseListingHtml(html, res.finalUrl || url)
  if (draft.price == null && draft.usefulArea == null && draft.totalArea == null) {
    throw new PortalReadError('O portal entregou a página sem os dados do anúncio (proteção contra robôs). Abra o anúncio, copie o texto e use "Colar texto".', true)
  }
  return draft
}
