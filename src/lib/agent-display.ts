/**
 * v1.4 — Hub do corretor: os mesmos dados, no mesmo formato, em todo o site
 * (página do imóvel, ficha impressa, estudo de mercado).
 *   Corretor Paulo Pop
 *   (61) 98409-0968  [ícone do WhatsApp]
 *   CRECI/DF Nº 12896
 *   Corretor Associado RE/MAX INOVELAR
 */
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

/** "12896/DF", "CRECI 12896 DF", "DF-12896" → "CRECI/DF Nº 12896". Sem UF: "CRECI Nº 12896". */
export function formatCreci(creci: string | null | undefined): string | null {
  const raw = String(creci ?? '').trim()
  if (!raw) return null
  const cleaned = raw.replace(/creci/gi, ' ').replace(/n[º°o]\.?/gi, ' ')
  let uf: string | null = null
  const tokens = cleaned.split(/[\s/\\|,;:-]+/).filter(Boolean)
  const rest: string[] = []
  for (const t of tokens) {
    const up = t.toUpperCase()
    if (!uf && UFS.includes(up)) uf = up
    else rest.push(t)
  }
  const number = rest.join('-').trim()
  if (!number) return null
  return uf ? `CRECI/${uf} Nº ${number}` : `CRECI Nº ${number}`
}

/** "61984090968" / "5561984090968" / "(61)98409-0968" → "(61) 98409-0968". Outros formatos voltam como vieram. */
export function formatPhoneBR(phone: string | null | undefined): string | null {
  const raw = String(phone ?? '').trim()
  if (!raw) return null
  let d = raw.replace(/\D/g, '')
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return raw
}

export interface AgentLike {
  name: string
  publicName?: string | null
  phone?: string | null
  whatsapp?: string | null
  creci?: string | null
  company?: string | null
  companyRole?: string | null
  avatarUrl?: string | null
}

export interface AgentDisplay {
  name: string
  phone: string | null
  /** só dígitos com DDI 55, para wa.me */
  whatsappDigits: string | null
  creci: string | null
  companyLine: string | null
  avatarUrl: string | null
}

/** Linha da imobiliária: "Corretor Associado RE/MAX INOVELAR". */
export function agentCompanyLine(company: string | null | undefined, role: string | null | undefined): string | null {
  const c = String(company ?? '').trim()
  const r = String(role ?? '').trim()
  if (!c && !r) return null
  if (!c) return r
  return `${r || 'Corretor Associado'} ${c}`
}

/** Dados de reserva. v1.5: `name`, `avatarUrl` e `creci` valem só para o dono do site (veja ownerFallback). */
export interface AgentFallback {
  whatsapp?: string | null
  phone?: string | null
  company?: string | null
  name?: string | null
  avatarUrl?: string | null
  creci?: string | null
}

const filled = (v: string | null | undefined) => (typeof v === 'string' && v.trim() ? v.trim() : null)

export function agentDisplay(agent: AgentLike, fallback: AgentFallback = {}): AgentDisplay {
  const wa = filled(agent.whatsapp) || filled(agent.phone) || filled(fallback.whatsapp) || filled(fallback.phone)
  const digits = wa ? wa.replace(/\D/g, '') : ''
  return {
    name: filled(agent.publicName) || filled(fallback.name) || agent.name,
    phone: formatPhoneBR(wa),
    whatsappDigits: digits ? (digits.length <= 11 ? `55${digits}` : digits) : null,
    creci: formatCreci(filled(agent.creci) || filled(fallback.creci)),
    companyLine: agentCompanyLine(filled(agent.company) || filled(fallback.company), agent.companyRole),
    avatarUrl: filled(agent.avatarUrl) || filled(fallback.avatarUrl),
  }
}

// ─── v1.5: Meu perfil incompleto → dados de Configurações → Perfil ─────────────

export interface OwnerConfigLike {
  ownerName?: string | null
  ownerPhotoUrl?: string | null
  ownerCreci?: string | null
  ownerCompany?: string | null
  ownerWhatsapp?: string | null
  ownerPhone?: string | null
  ownerEmail?: string | null
}

/**
 * O corretor é o dono do site? (administrador, ou e-mail igual ao de Configurações → Perfil).
 * Só o dono herda foto, nome e CRECI das Configurações; os outros corretores herdam só contato e imobiliária, como antes.
 */
export function isSiteOwner(agent: { role?: string | null; email?: string | null }, config: OwnerConfigLike | null | undefined): boolean {
  if (agent.role === 'ADMIN' || agent.role === 'SUPER_ADMIN') return true
  const a = filled(agent.email)?.toLowerCase()
  const o = filled(config?.ownerEmail)?.toLowerCase()
  return !!a && !!o && a === o
}

/** Reserva a usar no cartão do corretor, conforme ele seja ou não o dono do site. */
export function ownerFallback(agent: { role?: string | null; email?: string | null }, config: OwnerConfigLike | null | undefined): AgentFallback {
  const base: AgentFallback = { whatsapp: config?.ownerWhatsapp, phone: config?.ownerPhone, company: config?.ownerCompany }
  if (!isSiteOwner(agent, config)) return base
  return { ...base, name: config?.ownerName, avatarUrl: config?.ownerPhotoUrl, creci: config?.ownerCreci }
}

export interface ProfileGap { field: 'avatarUrl' | 'publicName' | 'creci' | 'company' | 'companyRole' | 'whatsapp'; label: string; fromConfig: boolean }

/**
 * O que falta (ou está diferente das Configurações) no Meu perfil do corretor.
 * `fromConfig` = o site está usando, no lugar, o dado de Configurações → Perfil.
 */
export function profileGaps(agent: AgentLike & { role?: string | null; email?: string | null }, config: OwnerConfigLike | null | undefined): ProfileGap[] {
  const owner = isSiteOwner(agent, config)
  const gaps: ProfileGap[] = []
  if (!filled(agent.avatarUrl)) gaps.push({ field: 'avatarUrl', label: 'Foto', fromConfig: owner && !!filled(config?.ownerPhotoUrl) })
  if (!filled(agent.publicName)) gaps.push({ field: 'publicName', label: 'Nome que aparece no site', fromConfig: owner && !!filled(config?.ownerName) })
  if (!filled(agent.creci)) gaps.push({ field: 'creci', label: 'CRECI', fromConfig: owner && !!filled(config?.ownerCreci) })
  if (!filled(agent.whatsapp) && !filled(agent.phone)) gaps.push({ field: 'whatsapp', label: 'WhatsApp', fromConfig: !!(filled(config?.ownerWhatsapp) || filled(config?.ownerPhone)) })
  if (!filled(agent.company)) gaps.push({ field: 'company', label: 'Imobiliária/franquia', fromConfig: !!filled(config?.ownerCompany) })
  else if (owner && filled(config?.ownerCompany) && filled(agent.company)!.toLowerCase() !== filled(config?.ownerCompany)!.toLowerCase()) {
    gaps.push({ field: 'company', label: `Imobiliária diferente das Configurações ("${filled(agent.company)}" × "${filled(config?.ownerCompany)}")`, fromConfig: false })
  }
  if (!filled(agent.companyRole)) gaps.push({ field: 'companyRole', label: 'Vínculo com a imobiliária (o site usa "Corretor Associado")', fromConfig: false })
  return gaps
}
