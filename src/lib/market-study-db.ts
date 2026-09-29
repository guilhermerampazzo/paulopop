import { prisma } from './prisma'

/** v1.2 — estudo completo (amostras, corretor e imóvel de origem). */
export function loadStudy(id: string) {
  return prisma.marketStudy.findUnique({
    where: { id },
    include: {
      samples: { orderBy: { order: 'asc' } },
      agent: { select: { id: true, name: true, creci: true, phone: true, whatsapp: true, email: true, avatarUrl: true, company: true, companyCreci: true } },
      property: { select: { id: true, ref: true, slug: true } },
    },
  })
}

export type StudyFull = NonNullable<Awaited<ReturnType<typeof loadStudy>>>
