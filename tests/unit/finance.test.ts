import { describe, expect, it } from 'vitest'
import { priceInstallment, monthlyRate, estimateMonthly, planTotals } from '@/lib/finance'

describe('finance — sistema Price', () => {
  it('converte taxa anual em mensal equivalente', () => {
    // 12,68% a.a. ≈ 1% a.m.
    expect(monthlyRate(12.6825)).toBeCloseTo(0.01, 4)
    expect(monthlyRate(0)).toBe(0)
    expect(monthlyRate(-5)).toBe(0)
  })

  it('calcula a parcela Price para 100 mil, 12,6825% a.a. em 12 meses (≈ 1% a.m.)', () => {
    // Fórmula clássica: 100000 * 0,01 * 1,01^12 / (1,01^12 - 1) ≈ 8884,88
    expect(priceInstallment(100_000, 12.6825, 12)).toBeCloseTo(8884.88, 0)
  })

  it('taxa zero vira divisão simples', () => {
    expect(priceInstallment(120_000, 0, 12)).toBe(10_000)
  })

  it('valores inválidos devolvem 0', () => {
    expect(priceInstallment(0, 10, 12)).toBe(0)
    expect(priceInstallment(100, 10, 0)).toBe(0)
    expect(priceInstallment(NaN, 10, 10)).toBe(0)
  })

  it('parcela cresce com o principal e cai com o prazo', () => {
    const a = priceInstallment(300_000, 11.5, 360)
    const b = priceInstallment(600_000, 11.5, 360)
    const c = priceInstallment(300_000, 11.5, 420)
    expect(b).toBeGreaterThan(a)
    expect(c).toBeLessThan(a)
    expect(a).toBeGreaterThan(0)
  })

  it('estimateMonthly aplica entrada de 20% e devolve null sem preço', () => {
    expect(estimateMonthly(null)).toBeNull()
    expect(estimateMonthly(0)).toBeNull()
    const v = estimateMonthly(500_000)!
    expect(v).toBeCloseTo(priceInstallment(400_000, 11.5, 360), 6)
  })

  it('planTotals soma juros corretamente', () => {
    const t = planTotals(120_000, 0, 12)
    expect(t.installment).toBe(10_000)
    expect(t.total).toBe(120_000)
    expect(t.interest).toBe(0)
    const t2 = planTotals(100_000, 12, 24)
    expect(t2.interest).toBeGreaterThan(0)
  })
})
