/** v1.3 — tipos de parceiro (mesmos valores do campo `Partner.type`). */
export const PARTNER_TYPES = ['CONSTRUTORA', 'BANCO', 'CARTORIO', 'REFORMA', 'MUDANCA', 'SEGUROS', 'OUTRO'] as const
export type PartnerType = typeof PARTNER_TYPES[number]

export const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  CONSTRUTORA: 'Construtora', BANCO: 'Banco / financiamento', CARTORIO: 'Cartório', REFORMA: 'Reforma e decoração',
  MUDANCA: 'Mudança', SEGUROS: 'Seguros', OUTRO: 'Outros',
}

export function partnerTypeLabel(type: string): string {
  return PARTNER_TYPE_LABEL[type as PartnerType] ?? type
}
