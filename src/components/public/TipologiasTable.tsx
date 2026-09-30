/**
 * v1.4 — Tipologias do empreendimento na página pública: nome, andar(es), quartos, suítes, banheiros,
 * varandas, áreas, vagas, posição solar, preço inicial, planta e quantas unidades estão anunciadas.
 * Server component. "Andar(es)" vem do campo do painel; se vazio, é calculado pelas unidades da tipologia.
 */
import { Bed, Bath, Car, Maximize2, Sun, Layers, FileImage } from 'lucide-react'
import { prisma } from '@/lib/prisma'

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
const area = (v: number) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v)} m²`

/** "1º ao 12º", "Térreo ao 3º", "5º". */
export function floorsRange(floors: number[]): string | null {
  if (!floors.length) return null
  const min = Math.min(...floors), max = Math.max(...floors)
  const f = (n: number) => (n === 0 ? 'Térreo' : `${n}º`)
  return min === max ? f(min) : `${f(min)} ao ${f(max)}`
}

export async function TipologiasTable({ empreendimentoId }: { empreendimentoId: string }) {
  const types = await prisma.empreendimentoUnitType.findMany({
    where: { empreendimentoId },
    orderBy: { order: 'asc' },
    include: { units: { select: { floor: true, properties: { where: { status: 'ACTIVE', hideOnSite: false }, select: { id: true } } } } },
  })
  if (!types.length) return null

  return (
    <div className="grid gap-3 md:grid-cols-2" data-testid="tipologias">
      {types.map(t => {
        const floors = (t.floorsLabel ?? '').trim() || floorsRange(t.units.map(u => u.floor))
        const available = t.units.reduce((a, u) => a + (u.properties.length ? 1 : 0), 0)
        const facts: Array<{ icon: React.ReactNode; text: string }> = []
        if (t.bedrooms != null) facts.push({ icon: <Bed className="h-4 w-4 text-[#2563eb]" />, text: `${t.bedrooms} ${t.bedrooms === 1 ? 'quarto' : 'quartos'}${t.suites ? ` (${t.suites} ${t.suites === 1 ? 'suíte' : 'suítes'})` : ''}` })
        if (t.bathrooms != null) facts.push({ icon: <Bath className="h-4 w-4 text-[#2563eb]" />, text: `${t.bathrooms} ${t.bathrooms === 1 ? 'banheiro' : 'banheiros'}` })
        if (t.area) facts.push({ icon: <Maximize2 className="h-4 w-4 text-[#2563eb]" />, text: `${area(Number(t.area))} privativos${t.totalArea ? ` · ${area(Number(t.totalArea))} totais` : ''}` })
        if (t.parking != null) facts.push({ icon: <Car className="h-4 w-4 text-[#2563eb]" />, text: `${t.parking} ${t.parking === 1 ? 'vaga' : 'vagas'}` })
        if (t.balconies) facts.push({ icon: <Sun className="h-4 w-4 text-[#2563eb]" />, text: `${t.balconies} ${t.balconies === 1 ? 'varanda' : 'varandas'}` })
        if (floors) facts.push({ icon: <Layers className="h-4 w-4 text-[#2563eb]" />, text: `Andar(es): ${floors}` })
        if (t.sunPosition) facts.push({ icon: <Sun className="h-4 w-4 text-[#2563eb]" />, text: `Posição: ${t.sunPosition}` })
        return (
          <article key={t.id} className="rounded-xl border border-gray-200 bg-[#F8FAFC] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="min-w-0 break-words font-semibold text-[#1e3a8a]">{t.name}</h3>
              {t.priceFrom && <p className="whitespace-nowrap text-sm font-bold text-[#1e3a8a]"><span className="text-xs font-normal text-gray-500">a partir de </span>{brl(Number(t.priceFrom))}</p>}
            </div>
            <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-gray-700 sm:grid-cols-2">
              {facts.map(f => <li key={f.text} className="flex items-start gap-1.5 break-words">{f.icon}<span className="min-w-0">{f.text}</span></li>)}
            </ul>
            {t.description && <p className="mt-2 break-words text-sm text-gray-600">{t.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              {t.finals && <span>Finais {t.finals}</span>}
              {t.units.length > 0 && <span>{t.units.length} {t.units.length === 1 ? 'unidade' : 'unidades'} no prédio</span>}
              {available > 0 && <span className="font-semibold text-emerald-700">{available} {available === 1 ? 'anunciada' : 'anunciadas'} agora</span>}
              {t.floorPlanUrl && <a href={t.floorPlanUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-[#2563eb] hover:underline"><FileImage className="h-3.5 w-3.5" /> Ver planta</a>}
            </div>
          </article>
        )
      })}
    </div>
  )
}
