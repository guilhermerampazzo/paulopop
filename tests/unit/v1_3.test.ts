import { describe, it, expect } from 'vitest'
import { normalizeAddressKey, schoolKind, minutes, mergeInsight } from '@/lib/area-insight-shared'
import { estimateRange } from '@/lib/valuation'

describe('v1.3 — Viver aqui', () => {
  it('normaliza o endereço para a chave de cache', () => {
    expect(normalizeAddressKey('QN 303, Conjunto 5 — Samambaia Sul, DF')).toBe('qn-303-conjunto-5-samambaia-sul-df')
    expect(normalizeAddressKey('  Águas Claras ')).toBe(normalizeAddressKey('aguas claras'))
  })
  it('classifica escolas públicas e particulares pelo nome', () => {
    expect(schoolKind('CEF 03 de Samambaia')).toBe('publica')
    expect(schoolKind('Escola Classe 512')).toBe('publica')
    expect(schoolKind('Colégio Objetivo')).toBe('particular')
  })
  it('calcula minutos a pé e de carro', () => {
    expect(minutes(800, 'walk')).toBe(10)
    expect(minutes(2000, 'drive')).toBe(5)
    expect(minutes(10, 'walk')).toBe(1)
  })
  it('junta dados automáticos e ajustes manuais', () => {
    const data = { categories: [{ key: 'metro', label: 'Metrô', places: [{ id: 'a', name: 'Estação', lat: 0, lng: 0, distanceM: 400, walkMin: 5, driveMin: 1 }, { id: 'b', name: 'Oculta', lat: 0, lng: 0, distanceM: 900, walkMin: 11, driveMin: 2 }] }], routes: [{ destination: 'Esplanada', km: 30, minutes: 45 }], fetchedAt: '' }
    const m = mergeInsight(data, { hidden: ['b'], highlights: [{ text: 'Metrô a 400 m' }], extraPlaces: [{ category: 'supermercado', name: 'Mercado X', distanceM: 300 }] })
    expect(m.hasContent).toBe(true)
    expect(m.tabs.find(t => t.tab === 'Transporte')?.categories[0].places.map(p => p.name)).toEqual(['Estação'])
    expect(m.tabs.find(t => t.tab === 'Comércio')?.categories[0].places[0].name).toBe('Mercado X')
    expect(m.highlights).toEqual(['Metrô a 400 m'])
    expect(mergeInsight(null, null).hasContent).toBe(false)
  })
})

describe('v1.3 — avaliação online', () => {
  const samples = [
    { price: 300000, area: 60, scope: 'bairro' as const },
    { price: 320000, area: 64, scope: 'bairro' as const },
    { price: 500000, area: 70, scope: 'cidade' as const },
  ]
  it('usa o escopo mais próximo com pelo menos 2 amostras', () => {
    const r = estimateRange({ area: 62, condition: 'PARCIAL', samples })
    expect(r.basis.scope).toBe('bairro')
    expect(r.basis.count).toBe(2)
    expect(r.sqm).toBe(5000)
    expect(r.mid).toBe(310000)
    expect(r.low).toBeLessThan(r.mid as number)
    expect(r.high).toBeGreaterThan(r.mid as number)
  })
  it('ajusta pelo estado de conservação', () => {
    const o = estimateRange({ area: 62, condition: 'ORIGINAL', samples }).mid as number
    const t = estimateRange({ area: 62, condition: 'TOTAL', samples }).mid as number
    expect(o).toBeLessThan(t)
  })
  it('devolve insuficiente sem amostras', () => {
    expect(estimateRange({ area: 62, condition: 'PARCIAL', samples: [{ price: 1, area: 1, scope: 'cidade' }] }).basis.scope).toBe('insuficiente')
  })
})
