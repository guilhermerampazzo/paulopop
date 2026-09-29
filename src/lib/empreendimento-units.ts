/**
 * v1.2 — geração da matriz de unidades de um bloco e atribuição de tipologia por final.
 */
export interface BlockSpec { floors: number; unitsPerFloor: number; firstFloor: number; numbering: 'FLOOR_SEQ' | 'SEQ' }

/** Ex.: 3 andares × 4 por andar, FLOOR_SEQ → 101..104, 201..204, 301..304 (térreo = 001..004 quando firstFloor = 0). */
export function generateUnitNumbers(spec: BlockSpec): Array<{ floor: number; number: string }> {
  const out: Array<{ floor: number; number: string }> = []
  const floors = Math.max(0, Math.min(200, Math.floor(spec.floors)))
  const per = Math.max(0, Math.min(60, Math.floor(spec.unitsPerFloor)))
  let seq = 1
  for (let f = 0; f < floors; f++) {
    const floor = spec.firstFloor + f
    for (let u = 1; u <= per; u++) {
      const number = spec.numbering === 'SEQ' ? String(seq++) : `${floor}${String(u).padStart(2, '0')}`
      out.push({ floor, number })
    }
  }
  return out
}

/** Final do apartamento: "1204" → "04", "7" → "07". */
export function unitFinal(number: string): string {
  const digits = number.replace(/\D/g, '')
  return digits.slice(-2).padStart(2, '0')
}

/** Escolhe a tipologia pelo final ("01,02,05"). Devolve o id ou null. */
export function pickUnitType(number: string, types: Array<{ id: string; finals: string | null }>): string | null {
  const fin = unitFinal(number)
  for (const t of types) {
    const finals = (t.finals ?? '').split(/[,\s;]+/).map(x => x.trim().replace(/\D/g, '')).filter(Boolean).map(x => x.slice(-2).padStart(2, '0'))
    if (finals.includes(fin)) return t.id
  }
  return null
}

export const STAGE_LABEL: Record<string, string> = { LANCAMENTO: 'Lançamento', EM_OBRAS: 'Em obras', ENTREGUE: 'Pronto para morar' }
export const STAGE_ORDER: Record<string, number> = { LANCAMENTO: 0, EM_OBRAS: 1, ENTREGUE: 2 }
