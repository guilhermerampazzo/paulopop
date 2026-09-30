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

export function agentDisplay(agent: AgentLike, fallback: { whatsapp?: string | null; phone?: string | null; company?: string | null } = {}): AgentDisplay {
  const wa = agent.whatsapp || agent.phone || fallback.whatsapp || fallback.phone || null
  const digits = wa ? wa.replace(/\D/g, '') : ''
  return {
    name: (agent.publicName ?? '').trim() || agent.name,
    phone: formatPhoneBR(wa),
    whatsappDigits: digits ? (digits.length <= 11 ? `55${digits}` : digits) : null,
    creci: formatCreci(agent.creci),
    companyLine: agentCompanyLine(agent.company ?? fallback.company, agent.companyRole),
    avatarUrl: agent.avatarUrl ?? null,
  }
}
