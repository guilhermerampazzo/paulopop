/** Campos internos que nunca saem no formato público (comissões, proprietário, documentos, financeiro). */
const PRIVATE_FIELDS = [
  'captureCommissionPct', 'captureCommissionAmt', 'captureCommissionType',
  'saleCommissionPct', 'saleCommissionAmt', 'saleCommissionType',
  'iptuRegistration', 'registryNumber', 'financialNotes', 'keyNumber',
  'ownerId', 'ownerName', 'owner', 'secondaryAgentId', 'sourceAgentName', 'sourceOfficeName',
  'salePrice', 'saleDiscountPct', 'saleDiscountValue', 'saleSource', 'saleNotes',
] as const

export function toPublicProperty<T extends Record<string, unknown>>(p: T): Omit<T, (typeof PRIVATE_FIELDS)[number]> {
  const copy: Record<string, unknown> = { ...p }
  for (const k of PRIVATE_FIELDS) delete copy[k]
  if (!copy.showFullAddress) {
    delete copy.number
    delete copy.complement
  }
  return copy as Omit<T, (typeof PRIVATE_FIELDS)[number]>
}
