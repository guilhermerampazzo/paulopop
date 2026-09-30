import { prisma } from './prisma'
import { computeStudy } from './market-study'

/**
 * v1.2 — estudo completo (amostras, corretor e imóvel de origem).
 * v1.4 — `approvedOnly`: só as amostras aprovadas (relatório público). No painel vêm todas.
 */
export function loadStudy(id: string, opts: { approvedOnly?: boolean } = {}) {
  return prisma.marketStudy.findUnique({
    where: { id },
    include: {
      samples: { where: opts.approvedOnly ? { candidateStatus: 'APPROVED' } : undefined, orderBy: { order: 'asc' } },
      agent: { select: { id: true, name: true, publicName: true, creci: true, phone: true, whatsapp: true, email: true, avatarUrl: true, company: true, companyRole: true, companyCreci: true } },
      property: { select: { id: true, ref: true, slug: true } },
    },
  })
}

export type StudyFull = NonNullable<Awaited<ReturnType<typeof loadStudy>>>

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v))

/** v1.4 — refaz os resultados do estudo com as amostras aprovadas (depois de aprovar ou recusar uma candidata). */
export async function recomputeStudy(studyId: string) {
  const study = await prisma.marketStudy.findUnique({ where: { id: studyId }, include: { samples: { orderBy: { order: 'asc' } } } })
  if (!study) return null
  const results = computeStudy(
    study.samples.map(s => ({ id: s.id, price: n(s.price), areaPrivate: n(s.areaPrivate), status: s.status, daysListed: s.daysListed, publishedAt: s.publishedAt, candidateStatus: s.candidateStatus })),
    { areaPrivate: n(study.areaPrivate) },
    { competitivePct: n(study.competitivePct) ?? 15, optimisticPct: n(study.optimisticPct) ?? 10, outlierPct: n(study.outlierPct) ?? 30, scenario: study.scenario, adjustPct: n(study.adjustPct) },
  )
  await prisma.marketStudy.update({ where: { id: studyId }, data: { results: results as never } })
  return results
}
