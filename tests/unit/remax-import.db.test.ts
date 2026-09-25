/**
 * Teste com banco de verdade (roda só quando DATABASE_URL está definido).
 * A rede da RE/MAX é simulada: as fotos são geradas na hora com o sharp.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs/promises'

const hasDb = !!process.env.DATABASE_URL
const uploadDir = path.join(os.tmpdir(), `pp-uploads-${Date.now()}`)
process.env.UPLOAD_DIR = uploadDir

vi.mock('@/lib/remax/client', async () => {
  const sharp = (await import('sharp')).default
  const img = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#3366aa' } }).jpeg().toBuffer()
  return {
    RemaxFetchError: class extends Error {},
    fetchRemaxListing: vi.fn(),
    fetchRemaxLabels: vi.fn(async () => ({ lookups: {}, translations: {} })),
    fetchRemaxAgent: vi.fn(async () => ({ agentName: 'Corretor Teste', officeName: 'REMAX TESTE' })),
    downloadRemaxImage: vi.fn(async (url: string) => {
      if (url.includes('quebrada')) throw new Error('404')
      return img
    }),
  }
})

const listing = {
  RegionId: 88, AgentId: 880221062, MLSID: '880221062-25', TotalNumOfRooms: 5, NumberOfBedrooms: 2,
  NumberOfBathrooms: 1, TotalArea: 46.88, PropertyTypeUID: 194, TransactionTypeUID: 261, ListingStatusUID: 160,
  StreetName: 'Qs 120 Conjunto 2', StreetNumber: '404', LocalZone: 'Samambaia Sul', City: 'Samambaia',
  Province: 'Distrito Federal', PostalCode: '72304502', ListingPrice: 189000, MaintenanceFee: '250.0000',
  MaintenanceFeeUID: 597, ShowAddressPublic: true,
  ListingImages: [
    { FileName: 'L_a.jpg', Order: '2' }, { FileName: 'L_b.jpg', Order: '1' }, { FileName: 'L_quebrada.jpg', Order: '3' },
  ],
  ListingFeatures: [
    { FeatureName: 'PropertyFeatures_Near Subway' }, { FeatureName: 'PropertyFeatures_Pets allowed' },
  ],
  ListingDescriptions: [
    { Description: 'Descrição<br />linha 2', DescriptionTypeUID: '629', LanguageCode: 'pt-BR' },
    { Description: 'Título do anúncio', DescriptionTypeUID: '1113', LanguageCode: 'pt-BR' },
  ],
  ShortLinks: [{ ShortLink: 'pt-br/imoveis/apartamento/venda/samambaia/404/880221062-25', LanguageCode: 'pt-BR' }],
}
const labels = {
  lookups: { '194': 'Apartamento', '261': 'Venda', '160': 'Ativo', '597': 'Mensal' },
  translations: { 'PropertyFeatures_Near Subway': 'Perto do metrô' },
}

describe.skipIf(!hasDb)('importRemaxListing() com banco', () => {
  let prisma: typeof import('@/lib/prisma').prisma
  let importRemaxListing: typeof import('@/lib/remax/import').importRemaxListing
  let agentId: string

  beforeAll(async () => {
    ;({ prisma } = await import('@/lib/prisma'))
    ;({ importRemaxListing } = await import('@/lib/remax/import'))
    await prisma.property.deleteMany({ where: { sourceId: 'remax:880221062-25' } })
    const user = await prisma.user.upsert({
      where: { email: 'teste-import@paulopop.local' },
      update: {},
      create: { email: 'teste-import@paulopop.local', name: 'Paulo Teste', password: 'x', role: 'ADMIN' },
    })
    agentId = user.id
  })

  afterAll(async () => {
    await prisma.property.deleteMany({ where: { sourceId: 'remax:880221062-25' } })
    await fs.rm(uploadDir, { recursive: true, force: true })
  })

  it('cria e publica o imóvel com fotos, ficha e características', async () => {
    const r = await importRemaxListing({ payload: { listing, labels }, agentId, publish: true })
    expect(r.created).toBe(true)
    expect(r.status).toBe('ACTIVE')
    expect(r.ref).toBe('880221062-25')
    expect(r.images).toBe(2)
    expect(r.imagesFailed).toBe(1)
    expect(r.sourceAgentName).toBe('Corretor Teste')

    const p = await prisma.property.findUniqueOrThrow({
      where: { id: r.id },
      include: { images: { orderBy: { order: 'asc' } }, features: true },
    })
    expect(p.slug).toBe('apartamento-venda-samambaia-sul-880221062-25')
    expect(Number(p.price)).toBe(189000)
    expect(Number(p.condominiumFee)).toBe(250)
    expect(p.condominiumFeePeriod).toBe('Mensal')
    expect(p.state).toBe('DF')
    expect(p.title).toBe('Título do anúncio')
    expect(p.description).toBe('Descrição\nlinha 2')
    expect(p.extraFeatures).toEqual(['Perto do metrô'])
    expect(p.features.map(f => f.feature)).toEqual(['ACCEPTS_PETS'])
    expect(p.images[0].isCover).toBe(true)
    expect(p.publishedAt).not.toBeNull()
    expect(p.sourceOfficeName).toBe('REMAX TESTE')
    const file = path.join(uploadDir, p.images[0].url.replace('/uploads/', ''))
    await expect(fs.stat(file)).resolves.toBeTruthy()
  })

  it('importar o mesmo link de novo atualiza, sem duplicar', async () => {
    const r = await importRemaxListing({
      payload: { listing: { ...listing, ListingPrice: 179000 }, labels }, agentId, publish: true,
    })
    expect(r.created).toBe(false)
    expect(await prisma.property.count({ where: { sourceId: 'remax:880221062-25' } })).toBe(1)
    const p = await prisma.property.findUniqueOrThrow({ where: { id: r.id }, include: { images: true } })
    expect(Number(p.price)).toBe(179000)
    expect(p.images).toHaveLength(2)
  })

  it('rascunho quando a publicação automática está desligada', async () => {
    await prisma.property.deleteMany({ where: { sourceId: 'remax:880221062-25' } })
    const r = await importRemaxListing({ payload: { listing, labels }, agentId, publish: false })
    expect(r.status).toBe('DRAFT')
  })
})
