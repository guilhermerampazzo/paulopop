import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL

if (!connectionString) throw new Error('DATABASE_URL nao configurada para o seed')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const imageSets = {
  apto: [
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=80',
  ],
  casa: [
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80',
  ],
  comercial: [
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80',
  ],
  terreno: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1600&q=80',
  ],
}

const videoUrls = [
  'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  'https://www.youtube.com/watch?v=ScMzIvxBSi4',
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'https://www.youtube.com/watch?v=ysz5S6PUM-U',
]

const sampleProperties = [
  ['PP-001', 'Apartamento com varanda gourmet em Umarizal', 'Apartamento', 'SALE', 'RESIDENTIAL', 'Belem', 'PA', 'Umarizal', 890000, 138, 3, 4, 2, 'apto'],
  ['PP-002', 'Casa com piscina em Cidade Nova', 'Casa', 'SALE', 'RESIDENTIAL', 'Ananindeua', 'PA', 'Cidade Nova', 690000, 240, 4, 4, 3, 'casa'],
  ['PP-003', 'Studio mobiliado em Nazare', 'Studio', 'RENT', 'RESIDENTIAL', 'Belem', 'PA', 'Nazare', 3600, 42, 1, 1, 1, 'apto'],
  ['PP-004', 'Terreno comercial em avenida de grande fluxo', 'Terreno', 'SALE', 'COMMERCIAL', 'Belem', 'PA', 'Marco', 1250000, 900, 0, 0, 0, 'terreno'],
  ['PP-005', 'Cobertura duplex com vista aberta', 'Cobertura', 'SALE', 'RESIDENTIAL', 'Belem', 'PA', 'Batista Campos', 1890000, 260, 4, 5, 3, 'apto'],
  ['PP-006', 'Sala comercial pronta para consultorio', 'Sala Comercial', 'RENT', 'COMMERCIAL', 'Belem', 'PA', 'Umarizal', 5200, 68, 0, 2, 1, 'comercial'],
  ['PP-007', 'Casa de praia mobiliada em Salinopolis', 'Casa', 'SALE', 'RESIDENTIAL', 'Salinopolis', 'PA', 'Atalaia', 980000, 320, 5, 5, 4, 'casa'],
  ['PP-008', 'Loja com mezanino em Batista Campos', 'Loja', 'RENT', 'COMMERCIAL', 'Belem', 'PA', 'Batista Campos', 8900, 145, 0, 2, 0, 'comercial'],
  ['PP-009', 'Apartamento compacto para investimento', 'Apartamento', 'SALE', 'RESIDENTIAL', 'Belem', 'PA', 'Marco', 420000, 64, 2, 2, 1, 'apto'],
  ['PP-010', 'Chacara com lago e area verde', 'Chacara', 'SALE', 'RESIDENTIAL', 'Castanhal', 'PA', 'Zona Rural', 1150000, 1200, 4, 4, 6, 'casa'],
] as const

async function upsertAdmin() {
  // v1.1: a senha inicial vem de ADMIN_PASSWORD (obrigatória fora do desenvolvimento)
  // e o seed NUNCA sobrescreve a senha nem os dados de um administrador já existente.
  const initialPassword = process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV === 'production' ? '' : 'admin123')
  if (!initialPassword || initialPassword.length < 8) {
    throw new Error('Defina ADMIN_PASSWORD (mínimo 8 caracteres) para criar o administrador inicial.')
  }
  const email = process.env.ADMIN_EMAIL ?? 'admin@paulopop.com.br'
  const password = await bcrypt.hash(initialPassword, 12)

  return prisma.user.upsert({
    where: { email },
    update: { active: true },
    create: {
      name: process.env.ADMIN_NAME ?? 'Paulo Pop',
      email,
      password,
      role: 'SUPER_ADMIN',
      creci: '12345-F',
      company: 'Paulo Pop Imóveis',
      phone: '(91) 3255-1000',
      whatsapp: '(91) 99111-0000',
      active: true,
    },
  })
}

async function upsertConfig() {
  const config = await prisma.siteConfig.findFirst()
  const data = {
    ownerName: 'Paulo Pop',
    ownerCreci: '12345-F',
    ownerCompany: 'Paulo Pop Imóveis',
    ownerWhatsapp: '(91) 99111-0000',
    ownerPhone: '(91) 3255-1000',
    ownerEmail: 'contato@paulopop.com.br',
    ownerAddress: 'Belem, Para',
    metaTitle: 'Paulo Pop | Corretor de Imóveis no DF',
    metaDescription: 'Imoveis para compra, venda e aluguel com atendimento consultivo.',
    heroTitle: 'Encontre o próximo imóvel com a consultoria de Paulo Pop',
    heroSubtitle: 'Compra, venda e aluguel de imóveis com atendimento consultivo.',
    whatsappMessage: 'Ola Paulo! Vi um imovel no site e gostaria de mais informacoes.',
  }

  if (config) return prisma.siteConfig.update({ where: { id: config.id }, data })
  return prisma.siteConfig.create({ data })
}

async function upsertOwner(index: number, name: string) {
  return prisma.contact.upsert({
    where: { cpf: `900000000${index.toString().padStart(2, '0')}` },
    update: {
      name,
      type: 'OWNER',
      email: `proprietario${index}@exemplo.com`,
      phone: `(91) 3255-11${index.toString().padStart(2, '0')}`,
      whatsapp: `(91) 99111-11${index.toString().padStart(2, '0')}`,
    },
    create: {
      name,
      cpf: `900000000${index.toString().padStart(2, '0')}`,
      type: 'OWNER',
      email: `proprietario${index}@exemplo.com`,
      phone: `(91) 3255-11${index.toString().padStart(2, '0')}`,
      whatsapp: `(91) 99111-11${index.toString().padStart(2, '0')}`,
    },
  })
}

async function upsertProperty(entry: (typeof sampleProperties)[number], index: number, agentId: string) {
  const [ref, title, propertyType, transactionType, purpose, city, state, neighborhood, price, totalArea, bedrooms, bathrooms, parking, imageKey] = entry
  const owner = await upsertOwner(index + 1, `Proprietario ${index + 1}`)
  const slug = slugify(`${ref}-${title}`)
  const images = imageSets[imageKey as keyof typeof imageSets]
  const baseData = {
    ref,
    slug,
    title,
    purpose,
    transactionType,
    location: 'BRAZIL' as const,
    status: 'ACTIVE' as const,
    contractType: transactionType === 'RENT' ? 'AUTHORIZATION' as const : 'EXCLUSIVE' as const,
    hideOnSite: false,
    propertyType,
    marketStatus: 'DISPONIVEL',
    condition: 'PRONTO',
    category: purpose === 'COMMERCIAL' ? 'COMERCIAL' : 'RESIDENCIAL',
    price,
    priceType: 'FIXED' as const,
    pricePerSqm: Number((price / totalArea).toFixed(2)),
    totalArea,
    usefulArea: totalArea,
    bedrooms,
    bathrooms,
    suites: bedrooms > 0 ? Math.min(2, bedrooms) : 0,
    environments: Math.max(3, bedrooms + 2),
    totalParkingSpots: parking,
    zipCode: `66000-${(100 + index).toString().padStart(3, '0')}`,
    address: `Endereco ${index + 1}`,
    number: `${100 + index}`,
    neighborhood,
    city,
    state,
    showFullAddress: true,
    titleEn: title,
    description: `${title}. Imovel de exemplo criado pela seed com dados prontos para navegacao, testes e demonstracao da plataforma.`,
    marketingDescription: `${title} em ${neighborhood}, ${city}. Imovel de exemplo com informacoes completas, imagens, video e documento para validar a experiencia do sistema.`,
    surroundingsInfo: `A regiao de ${neighborhood} em ${city} oferece infraestrutura, acesso e um contexto imobiliario interessante para quem busca praticidade e boa localizacao.`,
    ownerId: owner.id,
    ownerName: owner.name,
    agentId,
    virtualTourType: 'OTHER' as const,
    virtualTourUrl: videoUrls[index % videoUrls.length],
    externalLink: `https://paulopop.com.br/imoveis/${slug}`,
    publishedAt: new Date('2026-03-20T12:00:00.000Z'),
  }

  const nestedData = {
    features: {
      create: ['GARAGE', 'AIR_CONDITIONING', 'SECURITY_24H'].slice(0, bedrooms > 0 ? 3 : 2).map(feature => ({ feature: feature as never })),
    },
    lifestyles: {
      create: [purpose === 'COMMERCIAL' ? 'INVESTMENT' : 'METROPOLIS'].map(lifestyle => ({ lifestyle: lifestyle as never })),
    },
    rooms: {
      create: [
        { name: 'Sala principal', area: Math.max(18, Math.round(totalArea * 0.2)) },
        ...(bedrooms > 0 ? [{ name: 'Suite principal', area: 14 }] : []),
      ],
    },
    parkingSpots: {
      create: parking > 0 ? [{ quantity: parking, type: 'Coberta' }] : [],
    },
    images: {
      create: images.map((url, order) => ({
        url,
        thumbnailUrl: url,
        alt: title,
        caption: `${title} - imagem ${order + 1}`,
        order,
        isCover: order === 0,
      })),
    },
    videos: {
      create: [{ youtubeUrl: videoUrls[index % videoUrls.length], platform: 'YOUTUBE' }],
    },
    documents: {
      create: [{
        name: `Apresentacao-${ref}.pdf`,
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        type: 'PDF',
        size: 125000 + index * 1000,
        isPublic: true,
      }],
    },
    portals: {
      create: [
        { portalName: 'ZAP', active: true, externalId: `zap-${ref.toLowerCase()}` },
        { portalName: 'VivaReal', active: true, externalId: `vr-${ref.toLowerCase()}` },
      ],
    },
  }

  const existing = await prisma.property.findUnique({ where: { ref }, select: { id: true } })

  if (!existing) {
    await prisma.property.create({ data: { ...baseData, ...nestedData } })
    return
  }

  await prisma.property.update({
    where: { ref },
    data: {
      ...baseData,
      features: { deleteMany: {}, create: nestedData.features.create },
      lifestyles: { deleteMany: {}, create: nestedData.lifestyles.create },
      rooms: { deleteMany: {}, create: nestedData.rooms.create },
      parkingSpots: { deleteMany: {}, create: nestedData.parkingSpots.create },
      images: { deleteMany: {}, create: nestedData.images.create },
      videos: { deleteMany: {}, create: nestedData.videos.create },
      documents: { deleteMany: {}, create: nestedData.documents.create },
      portals: { deleteMany: {}, create: nestedData.portals.create },
    },
  })
}

async function upsertTestProperty(agentId: string) {
  const ref = 'TEST-PUBLISH'
  const slug = 'apartamento-teste-publicacao-completo'
  const existing = await prisma.property.findUnique({ where: { ref }, select: { id: true } })

  const baseData = {
    ref,
    slug,
    title: '[TESTE] Apartamento completo para publicação',
    purpose: 'RESIDENTIAL' as const,
    transactionType: 'SALE' as const,
    location: 'BRAZIL' as const,
    status: 'DRAFT' as const,
    contractType: 'EXCLUSIVE' as const,
    hideOnSite: false,
    propertyType: 'Apartamento',
    marketStatus: 'Disponível',
    condition: 'Novo',
    registrationDate: new Date('2026-01-01T00:00:00.000Z'),
    price: 850000,
    priceType: 'FIXED' as const,
    pricePerSqm: 6071,
    hidePrice: false,
    iptu: 3600,
    iptuPeriod: 'Anual',
    condominiumFee: 950,
    condominiumFeePeriod: 'Mensal',
    captureCommissionPct: 6,
    captureCommissionType: 'PERCENTAGE' as const,
    saleCommissionPct: 6,
    saleCommissionType: 'PERCENTAGE' as const,
    totalArea: 140,
    usefulArea: 128,
    floors: 12,
    environments: 5,
    bedrooms: 3,
    bathrooms: 3,
    suites: 2,
    totalParkingSpots: 2,
    zipCode: '01310-100',
    address: 'Avenida Paulista',
    number: '1000',
    complement: 'Apto 121',
    landmark: 'Próximo à estação MASP',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    region: 'Sudeste',
    showFullAddress: true,
    latitude: -23.5613,
    longitude: -46.6558,
    keyNumber: 'APT-121',
    description: 'Apartamento de alto padrão localizado na Avenida Paulista, região nobre de São Paulo. Três suítes, dois banheiros sociais, sala ampla com varanda gourmet e cozinha planejada. Dois vagas de garagem cobertas. Condomínio completo com academia, piscina e salão de festas. Pronto para morar.',
    marketingDescription: 'Viva o melhor de São Paulo neste sofisticado apartamento na Avenida Paulista. Alto padrão, localização privilegiada e infraestrutura completa de lazer. Agende uma visita e surpreenda-se.',
    surroundingsInfo: 'A Avenida Paulista é o coração financeiro e cultural de São Paulo. A poucos metros do MASP, estação de metrô, restaurantes, hospitais e shoppings. Infraestrutura completa e fácil acesso a toda a cidade.',
    agentId,
    virtualTourType: 'NONE' as const,
  }

  const nestedData = {
    features: {
      create: ['GARAGE', 'AIR_CONDITIONING', 'SECURITY_24H', 'POOL', 'GYM'].map(f => ({ feature: f as never })),
    },
    lifestyles: {
      create: [{ lifestyle: 'METROPOLIS' as never }],
    },
    rooms: {
      create: [
        { name: 'Sala de estar', area: 32 },
        { name: 'Suite principal', area: 22 },
        { name: 'Suite 2', area: 16 },
        { name: 'Quarto 3', area: 14 },
        { name: 'Cozinha', area: 18 },
      ],
    },
    parkingSpots: {
      create: [{ quantity: 2, type: 'Coberta' }],
    },
    images: {
      create: [
        { url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=400&q=75', alt: 'Sala de estar', caption: 'Ampla sala de estar com varanda', order: 0, isCover: true },
        { url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=400&q=75', alt: 'Cozinha', caption: 'Cozinha planejada com ilha', order: 1, isCover: false },
        { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1600&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=400&q=75', alt: 'Suite principal', caption: 'Suite principal com closet', order: 2, isCover: false },
        { url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1600&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=400&q=75', alt: 'Banheiro', caption: 'Banheiro com acabamento premium', order: 3, isCover: false },
      ],
    },
  }

  if (!existing) {
    await prisma.property.create({ data: { ...baseData, ...nestedData } })
    console.log('Imóvel de teste (DRAFT) criado: ref TEST-PUBLISH')
    return
  }

  await prisma.property.update({
    where: { ref },
    data: {
      ...baseData,
      features: { deleteMany: {}, create: nestedData.features.create },
      lifestyles: { deleteMany: {}, create: nestedData.lifestyles.create },
      rooms: { deleteMany: {}, create: nestedData.rooms.create },
      parkingSpots: { deleteMany: {}, create: nestedData.parkingSpots.create },
      images: { deleteMany: {}, create: nestedData.images.create },
    },
  })
  console.log('Imóvel de teste (DRAFT) atualizado: ref TEST-PUBLISH')
}

async function main() {
  const admin = await upsertAdmin()
  await upsertConfig()

  for (let index = 0; index < sampleProperties.length; index += 1) {
    await upsertProperty(sampleProperties[index], index, admin.id)
  }

  await upsertTestProperty(admin.id)

  console.log(`Admin pronto: ${process.env.ADMIN_EMAIL ?? 'admin@paulopop.com.br'} (senha de ADMIN_PASSWORD)`)
  console.log('10 imoveis de exemplo cadastrados com imagens, videos e documentos.')
  console.log('Imovel TEST-PUBLISH em DRAFT pronto para testar publicacao.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
