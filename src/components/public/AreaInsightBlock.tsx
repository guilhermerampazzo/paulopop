import { prisma } from '@/lib/prisma'
import { mergeInsight, type AreaData, type AreaManual } from '@/lib/area-insight-shared'
import { AreaInsightTabs } from './AreaInsightTabs'
import { Compass, Star, Car } from 'lucide-react'

/**
 * v1.3 — Bloco público "Viver aqui": comércio, escolas, saúde, transporte e trajetos no horário de pico
 * a partir do endereço do imóvel, do empreendimento ou da cidade (dados do AreaInsight + ajustes do corretor).
 */
export interface AreaInsightBlockProps {
  kind: 'property' | 'empreendimento' | 'city'
  id: string
}

export async function AreaInsightBlock({ kind, id }: AreaInsightBlockProps) {
  const sel = { select: { areaInsight: true } } as const
  const target = kind === 'property'
    ? await prisma.property.findUnique({ where: { id }, ...sel })
    : kind === 'empreendimento'
      ? await prisma.empreendimento.findUnique({ where: { id }, ...sel })
      : await prisma.cityPage.findUnique({ where: { id }, ...sel })
  const insight = target?.areaInsight
  if (!insight) return null
  const merged = mergeInsight((insight.data as unknown as AreaData) ?? null, (insight.manual as unknown as AreaManual) ?? null)
  if (!merged.hasContent) return null
  const mapSrc = insight.latitude != null && insight.longitude != null ? `https://www.google.com/maps?q=${insight.latitude},${insight.longitude}&z=15&output=embed` : null

  return (
    <section aria-labelledby="viver-aqui" className="rounded-2xl bg-white p-5 md:p-6 shadow-sm">
      <p className="text-[#ea580c] uppercase tracking-wide text-xs font-semibold">Viver aqui</p>
      <h2 id="viver-aqui" className="font-display text-xl md:text-2xl font-bold text-[#1e3a8a] flex items-center gap-2"><Compass className="h-5 w-5 text-[#2563eb]" /> Como é morar neste endereço</h2>
      {merged.summary && <p className="mt-2 text-sm text-gray-600 max-w-3xl">{merged.summary}</p>}

      {merged.highlights.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {merged.highlights.map((h, i) => <li key={i} className="inline-flex items-center gap-1 rounded-full bg-[#eff6ff] px-3 py-1 text-sm font-medium text-[#1e3a8a]"><Star className="h-3.5 w-3.5 text-[#ea580c]" /> {h}</li>)}
        </ul>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {merged.tabs.length > 0 && <AreaInsightTabs tabs={merged.tabs} />}
          {merged.routes.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-[#1e3a8a] flex items-center gap-2"><Car className="h-4 w-4" /> Saídas e trajetos no horário de pico (7h30, de carro)</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wide text-gray-500"><th className="py-1 pr-3">Destino</th><th className="py-1 pr-3">Distância</th><th className="py-1">Tempo estimado</th></tr></thead>
                  <tbody>{merged.routes.map(r => <tr key={r.destination} className="border-t border-gray-100"><td className="py-1.5 pr-3">{r.destination}</td><td className="py-1.5 pr-3">{r.km != null ? `${r.km.toLocaleString('pt-BR')} km` : '—'}</td><td className="py-1.5 font-medium text-[#1e3a8a]">{r.minutes != null ? `${r.minutes} min` : '—'}</td></tr>)}</tbody>
                </table>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">Estimativa no horário de pico com base no trânsito típico (Google). Pode variar conforme o dia.</p>
            </div>
          )}
        </div>
        {mapSrc && (
          <div className="rounded-xl overflow-hidden border border-gray-100 min-h-[240px]">
            <iframe src={mapSrc} title="Mapa da região" loading="lazy" className="h-full w-full min-h-[240px]" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          </div>
        )}
      </div>
    </section>
  )
}
