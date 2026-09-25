import { describe, it, expect } from 'vitest'
import { mapRemaxListing, parseRemaxId, htmlToText, type RemaxListing } from '@/lib/remax/map'
import { normalizePropertyUpdateInput } from '@/lib/property-update'

// Recorte real do anúncio 880221062-25 (remax.com.br, 24/09/2026)
const listing: RemaxListing = {
  RegionId: 88, AgentId: 880221062, RepresentingAgentID: 880221089,
  MLSID: '880221062-25', TotalNumOfRooms: 5, NumberOfBedrooms: 2, NumberOfBathrooms: 1, NumberOfFloors: 4,
  TotalArea: 46.88, PropertyTypeUID: 194, TransactionTypeUID: 261, MarketStatusUID: 5522,
  PropertyCategoryUID: 3110, ContractTypeUID: 25, ListingStatusUID: 160,
  FullAddress: 'Qs 120 Conjunto 2, 404, Samambaia Sul, Samambaia, Distrito Federal, 72304502',
  StreetNumber: '404', StreetName: 'Qs 120 Conjunto 2', RegionalZone: 'Região Centro-oeste',
  Province: 'Distrito Federal', City: 'Samambaia', LocalZone: 'Samambaia Sul', PostalCode: '72304502',
  ListingPrice: 189000, AvailabilityDate: '2026-07-24 12:00:00.0', ExpiryDate: 1800446400,
  YearBuilt: '2001', MonthBuiltUID: 3604, DesignatedLandUse: '3544', ShowContractTypeExclusive: true,
  MaintenanceFee: '250.0000', MaintenanceFeeUID: 597, PropertyTax: '601.0000', PropertyTaxPaymentPeriodUID: 6445,
  Location: { type: 'Point', coordinates: [-48.0615676, -15.8693996] }, ShowAddressPublic: true,
  ListingImages: [
    { FileName: 'L_3691f978-3f7b-43f8-87a1-837e5d000983.jpg', Order: '3', Name: 'IMG_1851.jpg' },
    { FileName: 'L_cd474f3c-2af9-4f17-819e-8713cb0de959.jpg', Order: '1', Name: 'IMG_1910.jpg' },
    { FileName: 'L_35ecd3f7-3434-4f35-bc13-7c922e301812.jpg', Order: '2', Name: 'IMG_1963.jpg' },
    { FileName: '../../etc/passwd', Order: '4' },
  ],
  ListingFeatures: [
    { GroupingName: 'PropertyFeatures_Exterior Type', FeatureName: 'PropertyFeatures_Stucco', FeatureID: '5' },
    { GroupingName: 'PropertyFeatures_Location', FeatureName: 'PropertyFeatures_Near Subway', FeatureID: '101' },
    { GroupingName: 'PropertyFeatures_Building Features', FeatureName: 'PropertyFeatures_Pets allowed', FeatureID: '350' },
    { GroupingName: 'PropertyFeatures_Utilities', FeatureName: 'PropertyFeatures_Intercommunication Device with TV Monitor', FeatureID: '428' },
    { GroupingName: 'PropertyFeatures_Interior Features', FeatureName: 'PropertyFeatures_Brown Cabinets', FeatureID: '479' },
  ],
  ListingDescriptions: [
    { Description: 'Apartamento 2 quartos samambaia QS 120 na frente do metro \r<br />5mins a pé da estação furnas\r<br />\r<br />\r<br />Aceita Financiamento/FGTS', DescriptionTypeUID: '629', LanguageCode: 'pt-BR' },
    { Description: 'Apartamento dois quartos em samambaia sul na frente do metro', DescriptionTypeUID: '1113', LanguageCode: 'pt-BR' },
  ],
  ShortLinks: [
    { ShortLink: 'en/listings/condo/apartment/for-sale/samambaia/404-qs-120-conjunto-2/880221062-25', LanguageCode: 'en-US' },
    { ShortLink: 'pt-br/imoveis/apartamento/venda/samambaia/404-qs-120-conjunto-2/880221062-25', LanguageCode: 'pt-BR' },
  ],
}

const labels = {
  lookups: {
    '194': 'Apartamento', '261': 'Venda', '5522': 'Ótimo Preço', '3110': 'Condomínio fechado',
    '160': 'Ativo', '3604': '01', '3544': 'Área residencial', '597': 'Mensal', '25': 'Com Representação',
  },
  translations: {
    'PropertyFeatures_Stucco': 'Reboco',
    'PropertyFeatures_Near Subway': 'Perto do metrô',
    'PropertyFeatures_Brown Cabinets': 'Armário embutido',
  },
}

describe('parseRemaxId()', () => {
  it('extrai o ID do link público', () => {
    expect(parseRemaxId('https://www.remax.com.br/pt-br/imoveis/apartamento/venda/samambaia/404-qs-120-conjunto-2/880221062-25')).toBe('880221062-25')
  })
  it('aceita o ID puro', () => {
    expect(parseRemaxId(' 880221062-25 ')).toBe('880221062-25')
  })
  it('recusa outros sites e links sem ID', () => {
    expect(parseRemaxId('https://evil.com/pt-br/imoveis/x/880221062-25')).toBeNull()
    expect(parseRemaxId('https://www.remax.com.br/pt-br/imoveis')).toBeNull()
    expect(parseRemaxId('texto qualquer')).toBeNull()
  })
})

describe('mapRemaxListing()', () => {
  const m = mapRemaxListing(listing, labels)

  it('copia preço, custos e datas', () => {
    expect(m.price).toBe(189000)
    expect(m.condominiumFee).toBe(250)
    expect(m.condominiumFeePeriod).toBe('Mensal')
    expect(m.iptu).toBe(601)
    expect(m.iptuPeriod).toBeNull() // código 6445 não tem rótulo na RE/MAX
    expect(m.availabilityDate?.toISOString().slice(0, 10)).toBe('2026-07-24')
    expect(m.constructionYear).toBe(2001)
    expect(m.constructionMonth).toBe(1)
  })

  it('traduz tipo, transação, status e contrato', () => {
    expect(m.propertyType).toBe('Apartamento')
    expect(m.transactionType).toBe('SALE')
    expect(m.purpose).toBe('RESIDENTIAL')
    expect(m.status).toBe('ACTIVE')
    expect(m.contractType).toBe('EXCLUSIVE')
    expect(m.marketStatus).toBe('Ótimo Preço')
    expect(m.category).toBe('Condomínio fechado')
    expect(m.landUse).toBe('Área residencial')
  })

  it('copia a ficha e o endereço', () => {
    expect(m).toMatchObject({
      environments: 5, bedrooms: 2, bathrooms: 1, floors: 4, totalArea: 46.88,
      address: 'Qs 120 Conjunto 2', number: '404', neighborhood: 'Samambaia Sul', city: 'Samambaia',
      state: 'DF', zipCode: '72304502', showFullAddress: true,
    })
    expect(m.latitude).toBeCloseTo(-15.8693996)
    expect(m.longitude).toBeCloseTo(-48.0615676)
  })

  it('usa título e descrição da RE/MAX, em texto', () => {
    expect(m.title).toBe('Apartamento dois quartos em samambaia sul na frente do metro')
    expect(m.description).toBe('Apartamento 2 quartos samambaia QS 120 na frente do metro\n5mins a pé da estação furnas\n\nAceita Financiamento/FGTS')
  })

  it('separa características fixas das livres, em português', () => {
    expect(m.features.sort()).toEqual(['ACCEPTS_PETS', 'INTERCOM'])
    expect(m.extraFeatures).toEqual(['Reboco', 'Perto do metrô', 'Armário embutido'])
  })

  it('ordena as fotos pela ordem da RE/MAX e ignora nomes estranhos', () => {
    expect(m.images.map(i => i.order)).toEqual([1, 2, 3])
    expect(m.images[0].url).toBe('https://cdn.gryphtech.com/userimages/88/LargeWM/L_cd474f3c-2af9-4f17-819e-8713cb0de959.jpg')
  })

  it('guarda a origem para atualizar sem duplicar', () => {
    expect(m.sourceId).toBe('remax:880221062-25')
    expect(m.ref).toBe('880221062-25')
    expect(m.sourceUrl).toBe('https://www.remax.com.br/pt-br/imoveis/apartamento/venda/samambaia/404-qs-120-conjunto-2/880221062-25')
    expect(m.agentIds).toEqual([880221089, 880221062])
    expect(m.slugBase).toBe('Apartamento-venda-Samambaia Sul-880221062-25')
  })

  it('funciona sem rótulos (usa o que dá)', () => {
    const bare = mapRemaxListing(listing, { lookups: {}, translations: {} })
    expect(bare.propertyType).toBeNull()
    expect(bare.transactionType).toBe('SALE')
    expect(bare.extraFeatures).toContain('Near Subway')
  })

  it('reconhece aluguel e vendido', () => {
    const rent = mapRemaxListing({ ...listing, TransactionTypeUID: 260, ListingStatusUID: 169 }, { ...labels, lookups: { ...labels.lookups, '169': 'Vendido' } })
    expect(rent.transactionType).toBe('RENT')
    expect(rent.status).toBe('SOLD')
  })

  it('exige o ID do anúncio', () => {
    expect(() => mapRemaxListing({ ...listing, MLSID: undefined }, labels)).toThrow()
  })
})

describe('htmlToText()', () => {
  it('remove tags e mantém quebras', () => {
    expect(htmlToText('a<br />b<script>x</script> &amp; c')).toBe('a\nbx & c')
  })
})

describe('normalizePropertyUpdateInput() — campos novos', () => {
  it('limpa as características livres e bloqueia os campos de origem', () => {
    const out = normalizePropertyUpdateInput({
      extraFeatures: ['  Perto do metrô ', '', 'Perto do metrô', 'Reboco'],
      constructionMonth: '7',
      sourceId: 'remax:hack', sourceUrl: 'x', importedAt: 'y',
    })
    expect(out.extraFeatures).toEqual(['Perto do metrô', 'Reboco'])
    expect(out.constructionMonth).toBe(7)
    expect(out).not.toHaveProperty('sourceId')
    expect(out).not.toHaveProperty('sourceUrl')
    expect(out).not.toHaveProperty('importedAt')
  })
})
