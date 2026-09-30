export const dynamic = 'force-dynamic'

/**
 * v1.4 — Ficha completa do imóvel para imprimir (A4, sem cortes).
 * Ordem pedida pelo Paulo: 12 fotos (a primeira é a principal), detalhes do imóvel, preço por m² comparado,
 * sobre este imóvel, características, quanto custa por mês, localização e mapa — mais o hub do corretor.
 * Página limpa (sem cabeçalho/rodapé do site), fora do índice do Google.
 */
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { absUrl } from '@/lib/site'
import { PrintMapImage } from '@/components/public/PrintMapImage'
import { formatCurrency, formatArea } from '@/lib/formatters'
import { groupFeatures } from '@/lib/property-features'
import { compareSqm } from '@/lib/property-compare'
import { sqmPublicView } from '@/lib/sqm-display'
import { agentDisplay } from '@/lib/agent-display'
import { estimateMonthly, DEFAULT_ANNUAL_RATE } from '@/lib/finance'
import { stripHtml } from '@/lib/sanitize'
import { AgentCard } from '@/components/public/AgentCard'
import { AutoPrint } from '@/components/public/AutoPrint'

interface Props { params: { slug: string } }

export const metadata: Metadata = { title: 'Ficha do imóvel', robots: { index: false, follow: false } }

const transactionLabel: Record<string, string> = { SALE: 'Venda', RENT: 'Aluguel' }
const MAX_PHOTOS = 12

/** Valor + período (MENSAL/ANUAL…) → valor mensal. */
function monthly(value: unknown, period: string | null): number {
  const v = Number(value ?? 0)
  if (!Number.isFinite(v) || v <= 0) return 0
  const p = String(period ?? '').toUpperCase()
  if (/ANUAL|YEAR|ANO/.test(p)) return v / 12
  if (/TRIMES/.test(p)) return v / 3
  if (/SEMES/.test(p)) return v / 6
  return v
}

const PRINT_CSS = `
@page { size: A4; margin: 11mm 10mm 12mm 10mm; }
.ficha { font-family: "Inter Variable", Inter, system-ui, sans-serif; color: #1f2937; }
.ficha section, .ficha .ficha-bloco { break-inside: avoid; page-break-inside: avoid; }
.ficha h2 { break-after: avoid; page-break-after: avoid; }
.ficha .ficha-foto { break-inside: avoid; page-break-inside: avoid; }
@media print {
  html, body { background: #fff !important; }
  .ficha-folha { box-shadow: none !important; margin: 0 !important; padding: 0 !important; max-width: none !important; width: auto !important; }
  .ficha-acoes { display: none !important; }
  .ficha a { color: inherit; text-decoration: none; }
}
`

export default async function FichaImpressaPage({ params }: Props) {
  const [property, config] = await Promise.all([
    prisma.property.findUnique({
      where: { slug: params.slug, status: 'ACTIVE', hideOnSite: false },
      include: {
        images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }], take: MAX_PHOTOS },
        features: true,
        lifestyles: true,
        agent: { select: { name: true, publicName: true, avatarUrl: true, company: true, companyRole: true, creci: true, phone: true, whatsapp: true } },
        empreendimento: { select: { name: true } },
      },
    }),
    prisma.siteConfig.findFirst(),
  ])

  if (!property) {
    const moved = await prisma.property.findFirst({ where: { previousSlugs: { has: params.slug }, status: 'ACTIVE', hideOnSite: false }, select: { slug: true } })
    if (moved) permanentRedirect(`/imoveis/${moved.slug}/imprimir`)
    notFound()
  }

  const price = property.price ? Number(property.price) : null
  const usefulArea = property.usefulArea ? Number(property.usefulArea) : null
  const totalArea = property.totalArea ? Number(property.totalArea) : null
  const showPrice = !!price && !property.hidePrice
  const place = [property.city, property.state].filter(Boolean).join(', ')
  const headline = property.propertyType ? [property.propertyType, transactionLabel[property.transactionType], place].filter(Boolean).join(' - ') : (property.title ?? 'Imóvel')
  const fullAddress = property.showFullAddress
    ? [property.address, property.number, property.complement, property.neighborhood, property.city, property.state, property.zipCode].filter(Boolean).join(', ')
    : [property.neighborhood, property.city, property.state].filter(Boolean).join(', ')
  const pageUrl = absUrl(`/imoveis/${property.slug}`)!

  const sqm = await compareSqm({
    id: property.id, price, usefulArea, totalArea, transactionType: property.transactionType,
    city: property.city, neighborhood: property.neighborhood, empreendimentoId: property.empreendimentoId,
  }).catch(() => null)
  const sqmView = sqmPublicView({
    own: sqm?.own ?? null,
    mode: property.sqmCompareMode,
    auto: sqm ? { region: sqm.region, building: sqm.building && property.empreendimento ? { ...sqm.building, label: property.empreendimento.name } : null } : null,
    manual: { value: property.sqmRefValue ? Number(property.sqmRefValue) : null, label: property.sqmRefLabel },
  })

  // Detalhes (ficha completa, sem recolher nada)
  const rows: Array<[string, string]> = []
  const add = (label: string, value: string | number | null | undefined) => { if (value !== null && value !== undefined && value !== '' && value !== 0) rows.push([label, String(value)]) }
  add('Código', property.ref)
  add('Tipo', property.propertyType)
  add('Condição', property.condition)
  add('Área útil', usefulArea ? formatArea(usefulArea) : null)
  add('Área total', totalArea ? formatArea(totalArea) : null)
  add('Área do terreno', property.landArea ? formatArea(Number(property.landArea)) : null)
  add('Dormitórios', property.bedrooms)
  add('Suítes', property.suites)
  add('Banheiros', property.bathrooms)
  add('Varandas', property.balconies)
  add('Vagas', property.totalParkingSpots)
  add('Ambientes', property.environments)
  add('Andar', property.floor)
  add('Número de pisos', property.floors)
  add('Ano/mês de construção', property.constructionYear ? `${property.constructionYear}${property.constructionMonth ? `/${String(property.constructionMonth).padStart(2, '0')}` : ''}` : null)
  add('Prédio / condomínio', property.empreendimento?.name)
  add('Categoria', property.category)

  const featureGroups = groupFeatures({ features: property.features.map(f => f.feature), extraFeatures: property.extraFeatures, lifestyles: property.lifestyles.map(l => l.lifestyle) })

  // Quanto custa por mês (mesma conta do simulador: entrada de 20%, 360 meses, taxa padrão)
  const condo = monthly(property.condominiumFee, property.condominiumFeePeriod)
  const iptu = monthly(property.iptu, property.iptuPeriod)
  const isRent = property.transactionType === 'RENT'
  const installment = !isRent && showPrice ? estimateMonthly(price) : null
  const monthlyRows: Array<[string, number]> = []
  if (isRent && showPrice) monthlyRows.push(['Aluguel', price!])
  if (installment) monthlyRows.push([`Parcela estimada (entrada de 20%, 360 meses, ${String(DEFAULT_ANNUAL_RATE).replace('.', ',')}% a.a.)`, installment])
  if (condo > 0) monthlyRows.push(['Condomínio', condo])
  if (iptu > 0) monthlyRows.push(['IPTU (mensal)', iptu])
  const monthlyTotal = monthlyRows.reduce((a, [, v]) => a + v, 0)

  const description = property.description ? stripHtml(property.description.replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, '\n')).replace(/\n{3,}/g, '\n\n').trim() : ''
  const surroundings = property.surroundingsInfo ? stripHtml(property.surroundingsInfo.replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, '\n')).trim() : ''
  const lat = property.latitude ? Number(property.latitude) : null
  const lng = property.longitude ? Number(property.longitude) : null
  const agent = agentDisplay(property.agent, { whatsapp: config?.ownerWhatsapp, phone: config?.ownerPhone, company: config?.ownerCompany })
  const [cover, ...others] = property.images
  const h2 = 'mb-2 border-b-2 border-[#dc1c2e] pb-1 text-[13pt] font-bold text-[#1e3a8a]'

  return (
    <div className="ficha min-h-screen bg-[#dfe2ea] py-6 print:bg-white print:py-0">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="ficha-acoes mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-3">
        <Link href={`/imoveis/${property.slug}`} className="text-sm text-[#2563eb] hover:underline">← Voltar ao anúncio</Link>
        <AutoPrint />
      </div>

      <div className="ficha-folha mx-auto w-full max-w-[210mm] bg-white px-[10mm] py-[10mm] shadow-lg">
        {/* Cabeçalho */}
        <div className="ficha-bloco mb-4 flex items-start justify-between gap-4 border-b border-gray-200 pb-3">
          <div className="min-w-0">
            <p className="text-[9pt] font-semibold uppercase tracking-wider text-[#2563eb]">{config?.ownerName ?? 'Paulo Pop'} · Ficha do imóvel</p>
            <h1 className="break-words text-[17pt] font-bold leading-tight text-[#1e3a8a]">{headline}</h1>
            {property.title && property.title !== headline && <p className="break-words text-[10.5pt] font-medium text-gray-700">{property.title}</p>}
            {fullAddress && <p className="mt-1 break-words text-[9.5pt] text-gray-600">{fullAddress}</p>}
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="whitespace-nowrap text-[17pt] font-bold text-[#1e3a8a]">
              {showPrice ? formatCurrency(price) : 'Consulte o valor'}{showPrice && isRent && <span className="text-[9pt] font-normal text-gray-500">/mês</span>}
            </p>
            {showPrice && sqm && <p className="whitespace-nowrap text-[9pt] text-gray-600">{formatCurrency(Math.round(sqm.own))}/m²</p>}
            <p className="whitespace-nowrap text-[9pt] text-gray-500">Código {property.ref}</p>
          </div>
        </div>

        {/* 1. Fotos: a principal grande e mais 11 */}
        {cover && (
          <section className="mb-4" aria-label="Fotos do imóvel">
            <div className="ficha-foto mb-2 flex h-[92mm] items-center justify-center overflow-hidden rounded-md bg-[#f3f4f6]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover.url} alt={cover.alt ?? `${headline} — foto principal`} className="max-h-full max-w-full object-contain" />
            </div>
            {others.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {others.map((img, i) => (
                  <figure key={img.id} className="ficha-foto m-0">
                    <div className="flex h-[32mm] items-center justify-center overflow-hidden rounded bg-[#f3f4f6]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.alt ?? `${headline} — foto ${i + 2}`} className="max-h-full max-w-full object-contain" />
                    </div>
                    {img.caption && <figcaption className="mt-0.5 truncate text-center text-[7.5pt] text-gray-500">{img.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 2. Detalhes do imóvel */}
        <section className="mb-4">
          <h2 className={h2}>Detalhes do imóvel</h2>
          <dl className="grid grid-cols-3 gap-x-5 text-[9.5pt]">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-gray-100 py-1">
                <dt className="text-gray-500">{label}</dt>
                <dd className="break-words text-right font-semibold text-[#1e3a8a]">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 3. Preço por m² comparado (mesma regra do site) */}
        {showPrice && sqm && (
          <section className="mb-4">
            <h2 className={h2}>Preço por m² comparado</h2>
            <div className="flex flex-wrap gap-3 text-[9.5pt]">
              <div className="rounded-md bg-[#f3f4f6] px-3 py-2">
                <p className="text-gray-500">Este imóvel</p>
                <p className="text-[12pt] font-bold text-[#1e3a8a]">{formatCurrency(Math.round(sqm.own))}/m²</p>
                <p className="text-[8pt] text-gray-500">preço ÷ área {usefulArea ? 'útil' : 'total'}</p>
              </div>
              {sqmView.headline === 'below' && sqmView.items.filter(i => i.verdict === 'below').map(i => (
                <div key={i.ref.kind + i.ref.label} className="rounded-md bg-[#f3f4f6] px-3 py-2">
                  <p className="text-gray-500">{i.ref.kind === 'manual' ? i.ref.label : `Média de ${i.ref.label}`}{i.ref.count != null ? ` (${i.ref.count})` : ''}</p>
                  <p className="text-[12pt] font-bold text-[#1e3a8a]">{formatCurrency(Math.round(i.ref.avg))}/m²</p>
                  <p className="text-[8.5pt] font-semibold text-emerald-700">Este imóvel está {i.text}</p>
                </div>
              ))}
              {sqmView.headline === 'market' && (
                <div className="flex items-center rounded-md bg-[#f3f4f6] px-3 py-2"><p className="font-semibold text-[#1e3a8a]">Imóvel no preço de mercado</p></div>
              )}
            </div>
            {sqmView.headline !== 'hidden' && <p className="mt-1 text-[7.5pt] text-gray-500">{sqmView.items.some(i => i.ref.kind === 'manual') ? 'Referência informada pelo corretor.' : 'Referência: média dos anúncios ativos do site na mesma modalidade.'} Não substitui uma avaliação.</p>}
          </section>
        )}

        {/* 4. Sobre este imóvel */}
        {description && (
          <section className="mb-4" style={{ breakInside: 'auto' }}>
            <h2 className={h2}>Sobre este imóvel</h2>
            <p className="whitespace-pre-line break-words text-[9.5pt] leading-relaxed text-gray-700">{description}</p>
          </section>
        )}

        {/* 5. Características */}
        {featureGroups.length > 0 && (
          <section className="mb-4">
            <h2 className={h2}>Características</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[9.5pt]">
              {featureGroups.map(g => (
                <div key={g.name} className="ficha-bloco min-w-0">
                  <p className="font-semibold text-[#2563eb]">{g.name}</p>
                  <p className="break-words text-gray-700">{g.items.join(' · ')}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. Quanto custa por mês */}
        {monthlyRows.length > 0 && (
          <section className="mb-4">
            <h2 className={h2}>Quanto custa por mês</h2>
            <table className="w-full text-[9.5pt]">
              <tbody>
                {monthlyRows.map(([label, value]) => (
                  <tr key={label} className="border-b border-gray-100"><td className="py-1 text-gray-600">{label}</td><td className="whitespace-nowrap py-1 text-right font-semibold text-[#1e3a8a]">{formatCurrency(Math.round(value))}</td></tr>
                ))}
                {monthlyRows.length > 1 && <tr><td className="py-1 font-bold text-[#1e3a8a]">Total estimado por mês</td><td className="whitespace-nowrap py-1 text-right text-[11pt] font-bold text-[#1e3a8a]">{formatCurrency(Math.round(monthlyTotal))}</td></tr>}
              </tbody>
            </table>
            {installment && <p className="mt-1 text-[7.5pt] text-gray-500">Simulação pelo sistema Price, sem seguros e taxas do banco. Os valores reais dependem da análise de crédito.</p>}
          </section>
        )}

        {/* 7. Localização e mapa */}
        {(fullAddress || surroundings || (lat && lng)) && (
          <section className="mb-4">
            <h2 className={h2}>Localização e mapa</h2>
            {fullAddress && <p className="break-words text-[9.5pt] font-semibold text-gray-800">{fullAddress}</p>}
            {surroundings && <p className="mt-1 whitespace-pre-line break-words text-[9.5pt] leading-relaxed text-gray-700">{surroundings}</p>}
            {lat && lng && (
              <div className="ficha-foto mt-2">
                <PrintMapImage src={`/api/mapa-estatico?lat=${lat}&lng=${lng}&w=1000&h=420&z=16`} alt={`Mapa da localização do imóvel ${property.ref}`} fallbackUrl={pageUrl} />
              </div>
            )}
          </section>
        )}

        {/* Hub do corretor */}
        <section className="ficha-bloco mt-5 rounded-md border border-gray-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <AgentCard agent={agent} variant="print" className="min-w-[70mm] flex-1" />
            <div className="min-w-0 text-right text-[8.5pt] text-gray-600">
              <p className="font-semibold text-[#1e3a8a]">Veja o anúncio completo</p>
              <p className="break-all">{pageUrl.replace(/^https?:\/\//, '')}</p>
              <p className="mt-1">Ficha gerada em {new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
            </div>
          </div>
        </section>

        <p className="mt-3 text-[7.5pt] leading-snug text-gray-400">
          Informações fornecidas pelo corretor, consideradas confiáveis, mas não garantidas; devem ser verificadas de forma independente. Valores e disponibilidade sujeitos a alteração sem aviso.
        </p>
      </div>
    </div>
  )
}
