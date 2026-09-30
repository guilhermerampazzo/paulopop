export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { loadStudy } from '@/lib/market-study-db'
import { StudyReport } from '@/components/public/StudyReport'
import { PrintButton } from '@/components/public/PrintButton'

export const metadata: Metadata = { title: 'Estudo de Mercado', robots: { index: false, follow: false } }

/** v1.2 — link público do estudo (token com validade), fora do índice do Google. */
export default async function EstudoPublicoPage({ params }: { params: { token: string } }) {
  const ref = await prisma.marketStudy.findUnique({ where: { publicToken: params.token }, select: { id: true, tokenExpiresAt: true, status: true } })
  if (!ref || ref.status !== 'DONE') notFound()
  if (ref.tokenExpiresAt && ref.tokenExpiresAt.getTime() < Date.now()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-[#1e3a8a]">Este link expirou</h1>
        <p className="mt-3 text-gray-600">Peça ao corretor um novo link do estudo de mercado.</p>
      </div>
    )
  }
  const study = await loadStudy(ref.id, { approvedOnly: true })
  if (!study) notFound()
  return (
    <div className="min-h-screen bg-[#dfe2ea] px-2 py-6 print:bg-white print:p-0">
      {/* v1.4: lâminas 16:9 — a regra de página vale só neste documento */}
      <style dangerouslySetInnerHTML={{ __html: '@page { size: 297mm 167mm; margin: 0; }' }} />
      <div className="mx-auto mb-4 flex max-w-[1100px] flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2563eb]">Estudo de mercado</p>
          <p className="text-sm text-gray-700">{study.title} · preparado por {study.agent.name}</p>
        </div>
        <PrintButton />
      </div>
      <StudyReport study={study} />
    </div>
  )
}
