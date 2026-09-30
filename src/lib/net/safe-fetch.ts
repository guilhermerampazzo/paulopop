/**
 * v1.4 — leitura segura de endereços externos pelo servidor (importador de portais, fotos de anúncios,
 * mosaico do mapa). Evita SSRF: só https, sem IP literal, sem nomes internos e sem destino em rede privada.
 */
import { lookup } from 'node:dns/promises'
import net from 'node:net'

export class UnsafeUrlError extends Error {}

const PRIVATE_V4 = [/^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./]

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return PRIVATE_V4.some(re => re.test(ip))
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase()
    if (v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return mapped ? isPrivateAddress(mapped[1]) : false
  }
  return true
}

/** Valida a forma da URL (sem consultar DNS). Lança UnsafeUrlError. */
export function assertPublicHttpsUrl(raw: string): URL {
  let u: URL
  try { u = new URL(raw) } catch { throw new UnsafeUrlError('Endereço inválido.') }
  if (u.protocol !== 'https:') throw new UnsafeUrlError('Só endereços https são aceitos.')
  if (u.username || u.password) throw new UnsafeUrlError('Endereço com usuário/senha não é aceito.')
  if (u.port && u.port !== '443') throw new UnsafeUrlError('Porta não permitida.')
  const host = u.hostname.toLowerCase()
  if (net.isIP(host.replace(/^\[|\]$/g, ''))) throw new UnsafeUrlError('Endereço por IP não é aceito.')
  if (!host.includes('.') || /(^|\.)(localhost|local|internal|lan|home|corp|test|invalid)$/.test(host)) throw new UnsafeUrlError('Endereço interno não é aceito.')
  return u
}

/** Confere também o destino no DNS (nenhum IP privado). */
export async function assertPublicHost(u: URL): Promise<void> {
  let addrs: Array<{ address: string }>
  try { addrs = await lookup(u.hostname, { all: true }) } catch { throw new UnsafeUrlError('Endereço não encontrado.') }
  if (!addrs.length || addrs.some(a => isPrivateAddress(a.address))) throw new UnsafeUrlError('Destino não permitido.')
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

export interface SafeFetchOptions {
  /** limite de bytes lidos (padrão 3 MB) */
  maxBytes?: number
  timeoutMs?: number
  accept?: string
  /** quando informado, o host precisa terminar com um destes sufixos */
  allowedHostSuffixes?: string[]
  userAgent?: string
  referer?: string
}

export function hostAllowed(host: string, suffixes: string[]): boolean {
  const h = host.toLowerCase()
  return suffixes.some(s => h === s || h.endsWith(`.${s}`))
}

/** GET seguro com redirecionamentos conferidos um a um. Devolve corpo como Buffer. */
export async function safeFetch(raw: string, opts: SafeFetchOptions = {}): Promise<{ status: number; contentType: string; body: Buffer; finalUrl: string }> {
  const maxBytes = opts.maxBytes ?? 3 * 1024 * 1024
  let url = raw
  for (let hop = 0; hop < 4; hop++) {
    const u = assertPublicHttpsUrl(url)
    if (opts.allowedHostSuffixes && !hostAllowed(u.hostname, opts.allowedHostSuffixes)) throw new UnsafeUrlError('Este site não está na lista de portais aceitos.')
    await assertPublicHost(u)
    const res = await fetch(u, {
      redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(opts.timeoutMs ?? 15000),
      headers: { 'user-agent': opts.userAgent ?? UA, accept: opts.accept ?? 'text/html,*/*', 'accept-language': 'pt-BR,pt;q=0.9', ...(opts.referer ? { referer: opts.referer } : {}) },
    })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) throw new UnsafeUrlError('Redirecionamento sem destino.')
      url = new URL(loc, u).toString()
      continue
    }
    const len = Number(res.headers.get('content-length') ?? 0)
    if (len && len > maxBytes) throw new UnsafeUrlError('Arquivo grande demais.')
    // lê em pedaços e para ao passar do limite (resposta sem content-length não enche a memória)
    const chunks: Buffer[] = []
    let total = 0
    if (res.body) {
      const reader = res.body.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > maxBytes) { await reader.cancel().catch(() => undefined); throw new UnsafeUrlError('Arquivo grande demais.') }
        chunks.push(Buffer.from(value))
      }
    }
    const buf = Buffer.concat(chunks)
    return { status: res.status, contentType: res.headers.get('content-type') ?? '', body: buf, finalUrl: u.toString() }
  }
  throw new UnsafeUrlError('Redirecionamentos demais.')
}
