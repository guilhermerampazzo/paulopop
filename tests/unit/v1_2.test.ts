import { describe, it, expect } from 'vitest'
import { generateUnitNumbers, unitFinal, pickUnitType } from '@/lib/empreendimento-units'
import { computeStudy, distanceKm, portalFromUrl, daysSince } from '@/lib/market-study'

describe('v1.2 — matriz de unidades', () => {
  it('gera numeração andar+sequência (101..304)', () => {
    const u = generateUnitNumbers({ floors: 3, unitsPerFloor: 4, firstFloor: 1, numbering: 'FLOOR_SEQ' })
    expect(u).toHaveLength(12)
    expect(u[0]).toEqual({ floor: 1, number: '101' })
    expect(u[11]).toEqual({ floor: 3, number: '304' })
  })
  it('gera numeração sequencial e térreo', () => {
    const u = generateUnitNumbers({ floors: 2, unitsPerFloor: 2, firstFloor: 0, numbering: 'SEQ' })
    expect(u.map(x => x.number)).toEqual(['1', '2', '3', '4'])
    expect(u[0].floor).toBe(0)
  })
  it('limita valores absurdos', () => {
    expect(generateUnitNumbers({ floors: 9999, unitsPerFloor: 9999, firstFloor: 1, numbering: 'SEQ' }).length).toBe(200 * 60)
  })
  it('extrai o final e escolhe a tipologia', () => {
    expect(unitFinal('1204')).toBe('04')
    expect(unitFinal('7')).toBe('07')
    const types = [{ id: 'A', finals: '1, 4' }, { id: 'B', finals: '02;03' }]
    expect(pickUnitType('304', types)).toBe('A')
    expect(pickUnitType('1202', types)).toBe('B')
    expect(pickUnitType('105', types)).toBeNull()
  })
})

describe('v1.2 — estudo de mercado', () => {
  const samples = [
    { price: 265000, areaPrivate: 62 },
    { price: 289000, areaPrivate: 64 },
    { price: 240000, areaPrivate: 60 },
    { price: 275000, areaPrivate: 62.5 },
    { price: 410000, areaPrivate: 63, status: 'DISCARDED' },
  ]
  it('calcula média do m² apenas com amostras válidas', () => {
    const r = computeStudy(samples, { areaPrivate: 62.5 })
    expect(r.n).toBe(5)
    expect(r.nValid).toBe(4)
    expect(r.mean).toBeCloseTo(4297.46, 1)
    expect(r.values.market).toBeCloseTo(268591.25, 0)
    expect(r.values.competitive).toBeCloseTo(268591.25 * 0.85, 0)
    expect(r.values.optimistic).toBeCloseTo(268591.25 * 1.1, 0)
    expect(r.suggested).toBe(r.values.market)
  })
  it('aplica cenário e ajuste manual', () => {
    const r = computeStudy(samples, { areaPrivate: 62.5 }, { scenario: 'COMPETITIVE', adjustPct: 5 })
    expect(r.suggested).toBeCloseTo((r.values.competitive as number) * 1.05, 0)
  })
  it('marca discrepantes e anúncios antigos', () => {
    const r = computeStudy([...samples, { price: 900000, areaPrivate: 60, daysListed: 200 }], { areaPrivate: 60 })
    const last = r.samples[r.samples.length - 1]
    expect(last.outlier).toBe(true)
    expect(last.oldListing).toBe(true)
    expect(r.oldListings).toBe(1)
  })
  it('sem amostras válidas devolve nulos', () => {
    const r = computeStudy([{ price: null, areaPrivate: null }], { areaPrivate: 50 })
    expect(r.nValid).toBe(0)
    expect(r.mean).toBeNull()
    expect(r.suggested).toBeNull()
  })
  it('utilitários', () => {
    expect(distanceKm(-15.7942, -47.8822, -15.7942, -47.8822)).toBe(0)
    expect(distanceKm(-15.79, -47.88, -15.80, -47.88)).toBeGreaterThan(1)
    expect(portalFromUrl('https://www.dfimoveis.com.br/x')).toBe('DF Imóveis')
    expect(portalFromUrl('https://www.olx.com.br/x')).toBe('OLX')
    expect(portalFromUrl('https://meusite.com')).toBe('Outro')
    expect(daysSince(null)).toBeNull()
    expect(daysSince(new Date(Date.now() - 3 * 86_400_000))).toBe(3)
  })
})
