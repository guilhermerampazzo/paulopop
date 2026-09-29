import { describe, expect, it } from 'vitest'
import { buildPropertySlug, isLegacySlug, proposePropertySlug, slugHasLocation, uniqueSlug } from '@/lib/property-slug'

describe('buildPropertySlug()', () => {
  it('monta tipo-transacao-bairro-ref', () => {
    expect(buildPropertySlug({ propertyType: 'Apartamento', transactionType: 'SALE', neighborhood: 'Taguatinga Norte', city: 'Taguatinga - DF', ref: '245856515' }))
      .toBe('apartamento-venda-taguatinga-norte-245856515')
  })

  it('sem bairro usa a cidade (sem o sufixo - DF) e aluguel', () => {
    expect(buildPropertySlug({ propertyType: 'Casa', transactionType: 'RENT', neighborhood: '', city: 'Samambaia - DF', ref: 'PP-010' }))
      .toBe('casa-aluguel-samambaia-pp010')
  })

  it('sem bairro e sem cidade usa tipo-transacao-ref', () => {
    expect(buildPropertySlug({ propertyType: 'Sala Comercial', transactionType: 'SALE', ref: '123' })).toBe('sala-comercial-venda-123')
  })

  it('sem tipo usa "imovel" e remove acentos', () => {
    expect(buildPropertySlug({ propertyType: null, transactionType: 'SALE', neighborhood: 'Águas Claras', ref: '1' })).toBe('imovel-venda-aguas-claras-1')
  })
})

describe('regras de troca de slug', () => {
  it('reconhece o padrão antigo', () => {
    expect(isLegacySlug('apartamento-residencial-245856515')).toBe(true)
    expect(isLegacySlug('loja-comercial-12')).toBe(true)
    expect(isLegacySlug('apartamento-venda-taguatinga-245856515')).toBe(false)
  })

  it('detecta se o slug já tem o bairro', () => {
    expect(slugHasLocation('apartamento-venda-taguatinga-norte-1', { neighborhood: 'Taguatinga Norte', city: null })).toBe(true)
    expect(slugHasLocation('apartamento-venda-1', { neighborhood: 'Taguatinga Norte', city: null })).toBe(false)
    expect(slugHasLocation('qualquer-coisa', { neighborhood: null, city: null })).toBe(true)
  })

  it('propõe slug novo para padrão antigo ou quando falta o bairro; mantém quando já serve', () => {
    const input = { propertyType: 'Apartamento', transactionType: 'SALE', neighborhood: 'Asa Sul', city: 'Brasília', ref: '99' }
    expect(proposePropertySlug('apartamento-residencial-99', input)).toBe('apartamento-venda-asa-sul-99')
    expect(proposePropertySlug('apartamento-venda-asa-norte-99', input)).toBe('apartamento-venda-asa-sul-99')
    expect(proposePropertySlug('apartamento-venda-asa-sul-99', input)).toBeNull()
    // slug personalizado que já contém o bairro é preservado
    expect(proposePropertySlug('lindo-apto-asa-sul-99', input)).toBeNull()
  })

  it('uniqueSlug acrescenta sufixo numérico', async () => {
    const taken = new Set(['a-b-1', 'a-b-1-2'])
    expect(await uniqueSlug('a-b-1', async s => taken.has(s))).toBe('a-b-1-3')
    expect(await uniqueSlug('livre', async s => taken.has(s))).toBe('livre')
  })
})
