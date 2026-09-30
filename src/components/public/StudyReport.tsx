/**
 * v1.2 — Relatório do Estudo de Mercado, no padrão do PDF da RE/MAX (16:9, uma "lâmina" por bloco).
 * Renderizado no servidor; a impressão (Ctrl+P / botão) gera o PDF com as páginas na proporção 16:9.
 */
import type { StudyFull } from '@/lib/market-study-db'
import type { StudyResults } from '@/lib/market-study'
import { fmtBRL } from '@/lib/market-study'
import { formatDuration } from '@/lib/sales'
import { SITE_URL } from '@/lib/site'
import { agentDisplay } from '@/lib/agent-display'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'

const n = (v: unknown) => (v == null ? null : Number(v))
const fmtDate = (d: Date | string | null | undefined) => (d ? new Intl.DateTimeFormat('pt-BR').format(new Date(d)) : '—')
const m2 = (v: number | null) => (v == null ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²`)
const km = (v: number | null) => (v == null ? '—' : v === 0 ? '0 km – mesmo condomínio' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km`)
const days = (v: number | null) => (v == null ? '—' : formatDuration(v))
const TRANS: Record<string, string> = { SALE: 'venda', RENT: 'locação' }
const DEMAND: Record<string, string> = { alta: 'Maior', media: 'Média', baixa: 'Menor' }
const RENOV: Record<string, string> = { nao: 'Não – original da construtora', parcial: 'Parcial', completa: 'Sim – completa' }

function Slide({ title, kicker, dark = false, children, id }: { title?: string; kicker?: string; dark?: boolean; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className={`study-slide relative overflow-hidden ${dark ? 'bg-[#0f2452] text-white' : 'bg-[#ededed] text-[#0f2452]'}`}>
      {/* faixas diagonais azuis, como no modelo */}
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-[40%] opacity-90" aria-hidden="true">
        <svg viewBox="0 0 400 100" className="h-full w-full" preserveAspectRatio="none">
          <polygon points="0,0 70,0 20,100 -50,100" fill={dark ? '#0d5cff' : '#e2e5ee'} />
          <polygon points="110,0 180,0 130,100 60,100" fill={dark ? '#0d5cff' : '#e2e5ee'} />
          <polygon points="220,0 290,0 240,100 170,100" fill={dark ? '#0d5cff' : '#e2e5ee'} />
          <polygon points="330,0 400,0 400,100 280,100" fill={dark ? '#0d5cff' : '#e2e5ee'} />
        </svg>
      </div>
      {(title || kicker) && (
        <div className="relative flex items-center justify-between px-10 pt-8">
          {title && <h2 className="flex items-center gap-3 text-2xl font-extrabold uppercase tracking-tight"><span className={`inline-block h-6 w-6 rounded-full ${dark ? 'bg-white' : 'bg-[#0f2452]'}`} style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)' }} />{title}</h2>}
          {kicker && <p className="text-2xl font-extrabold uppercase tracking-tight">{kicker}</p>}
        </div>
      )}
      <div className="relative px-10 pb-10 pt-6">{children}</div>
    </section>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '' || value === '—') return null
  return (
    <div>
      <p className="text-xs font-bold text-[#0f2452]">{label}</p>
      <p className="text-sm text-gray-700">{value}</p>
    </div>
  )
}

export function StudyReport({ study }: { study: StudyFull }) {
  const r = (study.results ?? null) as StudyResults | null
  const agent = study.agent
  // v1.4: mesmos dados do hub do corretor (nome público, WhatsApp formatado, CRECI/UF Nº, vínculo)
  const hub = agentDisplay(agent)
  const photos = (Array.isArray(study.photos) ? study.photos : []) as string[]
  const samples = study.samples
  const rowsStat = new Map((r?.samples ?? []).map(s => [s.id, s]))
  const suggested = r?.suggested ?? r?.values.market ?? null
  const fin = (study.finishes ?? null) as Record<string, string> | null

  return (
    <div className="study-report mx-auto max-w-[1100px] space-y-6 print:space-y-0">
      {/* Capa */}
      <Slide dark>
        <div className="grid grid-cols-[1fr_auto] gap-8">
          <div className="space-y-5 pt-6">
            <div><p className="text-xs tracking-[0.25em] text-blue-200">PREPARADO PARA</p><p className="text-2xl font-bold">{study.preparedFor ?? '—'}</p></div>
            <div><p className="text-xs tracking-[0.25em] text-blue-200">IMÓVEL</p><p className="text-lg font-semibold">{study.title}</p></div>
            <div><p className="text-xs tracking-[0.25em] text-blue-200">DATA DO ESTUDO</p><p className="text-lg">{fmtDate(study.studyDate)}</p></div>
            <div className="flex items-center gap-5 pt-8">
              <span className="relative inline-block h-24 w-24 overflow-hidden rounded-full border-4 border-white/20" style={{ background: 'linear-gradient(180deg,#d31c2c 0 33%,#f5f5f5 33% 66%,#0d5cff 66%)' }} aria-hidden="true" />
              <p className="text-5xl font-light uppercase leading-none tracking-[0.15em]">Estudo de<br /><span className="font-black tracking-[0.1em]">Mercado</span></p>
            </div>
          </div>
          <div className="flex flex-col items-end justify-end text-right">
            {agent.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.avatarUrl} alt={hub.name} className="mb-3 h-40 w-40 rounded-xl bg-white/10 object-contain" />
            )}
            <p className="text-2xl font-bold">{hub.name}</p>
            {hub.creci && <p className="text-sm text-blue-100">{hub.creci}</p>}
            {hub.companyLine && <p className="text-sm text-blue-100">{hub.companyLine}</p>}
          </div>
        </div>
        <div className="mt-8 flex items-center justify-between gap-8 rounded-lg bg-white px-6 py-5 text-[#0f2452]">
          <p className="max-w-4xl text-sm leading-relaxed">{study.intro}</p>
          <div className="text-right">
            <p className="text-[10px] font-bold tracking-widest">IMÓVEIS</p>
            <p className="text-3xl font-black leading-none">RE<span className="text-[#d31c2c]">/</span>MAX</p>
            {agent.company && <p className="text-xs font-semibold">{agent.company.replace(/re\/?max\s*/i, '')}</p>}
            {agent.companyCreci && <p className="text-[9px]">CRECI {agent.companyCreci}</p>}
          </div>
        </div>
      </Slide>

      {/* Preço x tempo */}
      <Slide>
        <div className="mx-auto max-w-4xl rounded-lg bg-white px-10 py-10 text-center">
          <h3 className="text-3xl font-extrabold">O preço do imóvel impacta diretamente no tempo de venda</h3>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-gray-700">O tempo de venda do seu imóvel está diretamente relacionado a uma avaliação correta. Imóveis ofertados com avaliações acima do preço que o mercado paga no momento sofrem com a falta de interesse de compradores, atrasando o seu objetivo.</p>
          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-4 gap-1 text-[11px] font-bold uppercase">
            <div className="text-[#0f2452]">Valor abaixo<br />do mercado<div className="mt-2 h-2 bg-[#0f2452]" /></div>
            <div className="text-[#7bbf3a]">Valor<br />competitivo<div className="mt-2 h-2 bg-[#7bbf3a]" /></div>
            <div className="text-[#f39c2b]">Valor de<br />mercado<div className="mt-2 h-2 bg-[#f39c2b]" /></div>
            <div className="text-[#d9463e]">Valor acima<br />de mercado<div className="mt-2 h-2 bg-[#d9463e]" /></div>
          </div>
          <div className="mx-auto mt-2 flex max-w-3xl justify-between text-sm font-bold"><span>‹ MENOR</span><span>TEMPO</span><span>MAIOR ›</span></div>
          <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-x-10 gap-y-3 text-left text-sm text-gray-700">
            {['Negócios realizados em prazos mais curtos.', 'Minimizar problemas e inconveniências.', 'Mais interessados e mais visitas.', 'Ofertas mais compatíveis.', 'Visibilidade de reais interessados.', 'Representação de um corretor especialista para o mercado.'].map(t => <li key={t} className="flex gap-2"><span className="text-gray-400">✱</span>{t}</li>)}
          </ul>
        </div>
      </Slide>

      {/* Metodologia */}
      <Slide title="Metodologia">
        <div className="grid grid-cols-2 gap-8 rounded-lg bg-white p-8">
          {(study.methodology ?? '').split('\n').filter(Boolean).map((line, i) => {
            const [head, ...rest] = line.split(':')
            return (
              <div key={i}>
                <p className="text-base font-bold text-[#0f2452]">{head}</p>
                <p className="mt-1 text-sm text-gray-700">{rest.join(':').trim()}</p>
              </div>
            )
          })}
        </div>
      </Slide>

      {/* Imóvel em avaliação */}
      <Slide title="Análise comparativa de mercado" kicker="Imóvel em avaliação" dark>
        <div className="grid grid-cols-[400px_1fr] gap-8 rounded-lg bg-white p-6 text-[#0f2452]">
          <div>
            {photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[0]} alt="" className="h-72 w-full rounded object-cover" />
            ) : <div className="h-72 w-full rounded bg-gray-100" />}
          </div>
          <div className="space-y-4">
            <p className="text-lg"><strong>Anunciado por:</strong> {study.advertiser ?? '—'}</p>
            <p className="text-lg"><strong>Local:</strong> {[study.address, study.neighborhood, study.city && `${study.city}${study.state ? `, ${study.state}` : ''}`].filter(Boolean).join(' – ')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded bg-[#0f2452] px-4 py-3 text-center text-white"><span className="font-bold">Valor de mercado:</span> {fmtBRL(r?.values.market)}</div>
              <div className="rounded bg-[#0f2452] px-4 py-3 text-center text-white"><span className="font-bold">Média do m²:</span> {fmtBRL(r?.mean)}</div>
            </div>
            <div className="grid grid-cols-4 gap-x-4 gap-y-3">
              <Field label="Tipo de imóvel" value={study.propertyType} />
              <Field label="Área privativa" value={m2(n(study.areaPrivate))} />
              <Field label="Quartos" value={study.bedrooms} />
              <Field label="Banheiros" value={study.bathrooms} />
              <Field label="Vagas" value={study.parking != null ? `${study.parking}${study.parkingType ? ` ${study.parkingType}` : ''}` : null} />
              <Field label="Conservação" value={study.condition} />
              <Field label="Condomínio" value={study.condoFee ? fmtBRL(n(study.condoFee)) : null} />
              <Field label="Reforma" value={study.renovation ? `${RENOV[study.renovation] ?? study.renovation}${study.renovationNotes ? ` – ${study.renovationNotes}` : ''}` : null} />
              <Field label="Demanda" value={study.demand ? `${DEMAND[study.demand] ?? study.demand}${study.demandNotes ? ` (${study.demandNotes})` : ''}` : null} />
              <Field label="Andar" value={study.floor ? `${study.floor}${study.buildingFloors ? ` de ${study.buildingFloors}` : ''}${study.elevator === false ? ', sem elevador' : study.elevator ? ', com elevador' : ''}` : null} />
              <Field label="Lazer" value={study.leisure} />
              <Field label="Posição solar" value={study.sunPosition} />
              <Field label="Idade" value={study.age != null ? `${study.age} anos` : null} />
              <Field label="Piso" value={fin?.piso} />
              <Field label="Forro" value={fin?.forro} />
              <Field label="Pintura" value={fin?.pintura} />
            </div>
          </div>
        </div>
        {study.notes && (
          <div className="mt-4 rounded-lg bg-white p-5 text-[#0f2452]">
            <p className="text-sm font-bold uppercase tracking-wide">Alguma observação no imóvel?</p>
            <p className="mt-2 rounded bg-[#e6e8ef] px-4 py-3 text-sm text-gray-800">{study.notes}</p>
          </div>
        )}
      </Slide>

      {/* Registro fotográfico */}
      {photos.length > 1 && (
        <Slide title="Imóvel em avaliação" kicker="Registro fotográfico" dark>
          <div className="grid grid-cols-3 gap-4">
            {photos.slice(0, 6).map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p} alt="" className="h-52 w-full rounded object-cover" />
            ))}
          </div>
        </Slide>
      )}

      {/* Uma lâmina por amostra */}
      {samples.map((s, i) => {
        const st = rowsStat.get(s.id)
        return (
          <Slide key={s.id} title="Amostras comparativas" kicker={`Amostra ${i + 1}`}>
            <div className="grid grid-cols-[400px_1fr] gap-8 rounded-lg bg-white p-6">
              <div>
                {s.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photoUrl} alt="" className="h-72 w-full rounded object-cover" />
                ) : <div className="h-72 w-full rounded bg-gray-100" />}
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-3 block rounded bg-[#0d5cff] px-4 py-3 text-center text-sm font-bold uppercase text-white">Ver anúncio no portal ↗ <span className="ml-2 text-xs font-normal normal-case opacity-80">{s.portal}</span></a>
                )}
              </div>
              <div className="space-y-4">
                <p className="text-lg"><strong>Anunciado por:</strong> {s.advertiser ?? s.portal ?? '—'}
                  {s.status === 'VALID' ? <span className="ml-3 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">Amostra válida</span> : <span className="ml-3 rounded-full bg-gray-200 px-3 py-1 text-xs font-bold text-gray-700">Descartada{s.discardReason ? ` – ${s.discardReason}` : ''}</span>}
                  {st?.oldListing && <span className="ml-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Anúncio antigo – possível especulação</span>}
                </p>
                <p className="text-lg"><strong>Local:</strong> {s.location ?? '—'}{s.sameCondo ? ' (MESMO CONDOMÍNIO)' : ''}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded bg-[#0f2452] px-4 py-3 text-center text-white"><span className="font-bold">Valor anunciado:</span> {fmtBRL(n(s.price))}</div>
                  <div className="rounded bg-[#0f2452] px-4 py-3 text-center text-white"><span className="font-bold">Valor do metro²:</span> {fmtBRL(st?.pricePerSqm ?? null)}</div>
                </div>
                <div className="grid grid-cols-4 gap-x-4 gap-y-3">
                  <Field label="Tipo de imóvel" value={study.propertyType} />
                  <Field label="Área privativa" value={m2(n(s.areaPrivate))} />
                  <Field label="Área total" value={s.areaTotal ? m2(n(s.areaTotal)) : null} />
                  <Field label="Quartos" value={s.bedrooms} />
                  <Field label="Banheiros" value={s.bathrooms} />
                  <Field label="Vagas" value={s.parking} />
                  <Field label="Reforma" value={s.renovation} />
                  <Field label="Distância do avaliado" value={km(n(s.distanceKm))} />
                  <Field label="Anunciado há" value={days(st?.daysListed ?? null)} />
                  <Field label="Andar" value={s.floor} />
                  <Field label="Posição" value={s.sunPosition} />
                  <Field label="Condomínio" value={s.condoFee ? fmtBRL(n(s.condoFee)) : null} />
                  <Field label="Idade" value={s.age != null ? `${s.age} anos` : null} />
                </div>
              </div>
            </div>
            {(s.notes || s.url) && (
              <div className="mt-4 rounded-lg bg-white p-5">
                {s.notes && <><p className="text-sm font-bold uppercase tracking-wide">Alguma observação no imóvel?</p><p className="mt-2 rounded bg-[#e6e8ef] px-4 py-3 text-sm text-gray-800">{s.notes}</p></>}
                {s.url && <p className="mt-2 break-all text-xs text-[#0d5cff] underline">{s.url}</p>}
              </div>
            )}
          </Slide>
        )
      })}

      {/* Resumo comparativo */}
      {samples.length > 0 && (
        <Slide title="Resumo comparativo" dark>
          <div className="overflow-hidden rounded-lg bg-white text-[#0f2452]">
            <table className="w-full text-sm">
              <thead className="bg-[#dfe3ee] text-left text-[11px] font-bold uppercase tracking-wide">
                <tr><th className="px-3 py-2">Foto</th><th className="px-3 py-2">Endereço</th><th className="px-3 py-2">A.P.</th><th className="px-3 py-2">Dorm.</th><th className="px-3 py-2">Dist.</th><th className="px-3 py-2">Anunciado há</th><th className="px-3 py-2">Vagas</th><th className="px-3 py-2">Valor</th><th className="px-3 py-2">Valor m²</th></tr>
              </thead>
              <tbody>
                {samples.map(s => {
                  const st = rowsStat.get(s.id)
                  return (
                    <tr key={s.id} className="border-t border-gray-200">
                      <td className="px-3 py-2">{s.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.photoUrl} alt="" className="h-14 w-20 rounded object-cover" />) : <div className="h-14 w-20 rounded bg-gray-100" />}</td>
                      <td className="px-3 py-2">{s.location ?? '—'}{s.sameCondo ? ' (MESMO CONDOMÍNIO)' : ''}{s.url && <a href={s.url} className="block text-xs text-[#0d5cff]" target="_blank" rel="noopener noreferrer">ver anúncio ↗</a>}</td>
                      <td className="px-3 py-2">{m2(n(s.areaPrivate))}</td>
                      <td className="px-3 py-2">{s.bedrooms ?? '—'}</td>
                      <td className="px-3 py-2">{km(n(s.distanceKm))}</td>
                      <td className="px-3 py-2">{days(st?.daysListed ?? null)}</td>
                      <td className="px-3 py-2">{s.parking ?? '—'}</td>
                      <td className="px-3 py-2 font-semibold">{fmtBRL(n(s.price), 0)}</td>
                      <td className="px-3 py-2 font-semibold">{fmtBRL(st?.pricePerSqm ?? null)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Slide>
      )}

      {/* Análise estatística */}
      {r && r.nValid > 0 && (
        <Slide title="Análise estatística" kicker={`Diferencial ${agent.name.split(' ')[0]}`}>
          <div className="rounded-lg bg-white p-6">
            <div className="grid grid-cols-5 gap-3">
              {[
                ['Amostras', String(r.nValid), `${r.nValid} válidas após saneamento`],
                ['Média R$/m²', fmtBRL(r.mean), 'base área privativa'],
                ['Mediana R$/m²', fmtBRL(r.median), 'menos sensível a extremos'],
                ['Desvio padrão', fmtBRL(r.std), `amplitude ${fmtBRL(r.min, 0)} – ${fmtBRL(r.max, 0)}`],
                ['Coef. variação', r.cv != null ? `${r.cv.toLocaleString('pt-BR')}%` : '—', r.cv != null ? (r.cv < 15 ? 'baixa dispersão (amostra homogênea)' : r.cv < 30 ? 'dispersão moderada' : 'alta dispersão') : ''],
              ].map(([l, v, h]) => (
                <div key={l} className="rounded bg-[#f3f4f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{l}</p><p className="text-xl font-bold">{v}</p><p className="text-[11px] text-gray-500">{h}</p></div>
              ))}
            </div>
            <table className="mt-5 w-full text-sm">
              <thead className="bg-[#0f2452] text-left text-[11px] font-bold uppercase text-white"><tr><th className="px-3 py-2">Amostra</th><th className="px-3 py-2">Local</th><th className="px-3 py-2 text-right">Valor</th><th className="px-3 py-2 text-right">R$/m² A.P.</th><th className="px-3 py-2 text-right">Anunciado há</th><th className="px-3 py-2 text-right">Desvio da média</th><th className="px-3 py-2">Status (±{n(study.outlierPct)}%)</th></tr></thead>
              <tbody>
                {samples.map((s, i) => {
                  const st = rowsStat.get(s.id)
                  return (
                    <tr key={s.id} className="border-t border-gray-100">
                      <td className="px-3 py-1.5 text-[#0d5cff]">Amostra {i + 1}</td>
                      <td className="px-3 py-1.5">{s.location ?? '—'}</td>
                      <td className="px-3 py-1.5 text-right">{fmtBRL(n(s.price), 0)}</td>
                      <td className="px-3 py-1.5 text-right">{fmtBRL(st?.pricePerSqm ?? null)}</td>
                      <td className="px-3 py-1.5 text-right">{days(st?.daysListed ?? null)}{st?.oldListing ? ' ⚠' : ''}</td>
                      <td className="px-3 py-1.5 text-right">{st?.deviationPct != null ? `${st.deviationPct > 0 ? '+' : ''}${st.deviationPct.toLocaleString('pt-BR')}%` : '—'}</td>
                      <td className="px-3 py-1.5">{s.status !== 'VALID' ? <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs">descartada</span> : st?.outlier ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">discrepante</span> : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">válida</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded border-2 border-[#0f2452] bg-[#eef2fb] p-4">
                <p className="text-xs font-bold uppercase">Padrão RE/MAX</p>
                <p className="text-xs text-gray-500">todas as amostras válidas · base área privativa</p>
                <p className="mt-2 text-sm">Competitivo: <strong>{fmtBRL(r.values.competitive, 0)}</strong></p>
                <p className="text-sm">Mercado: <strong>{fmtBRL(r.values.market, 0)}</strong></p>
                <p className="text-sm">Otimista: <strong>{fmtBRL(r.values.optimistic, 0)}</strong></p>
              </div>
              <div className="rounded border border-gray-200 p-4">
                <p className="text-xs font-bold uppercase">Cenário em destaque</p>
                <p className="text-xs text-gray-500">{r.scenario === 'COMPETITIVE' ? 'valor competitivo' : r.scenario === 'OPTIMISTIC' ? 'valor otimista' : 'valor de mercado'}{r.adjustPct ? ` com ajuste de ${r.adjustPct > 0 ? '+' : ''}${r.adjustPct}%` : ''}</p>
                <p className="mt-2 text-2xl font-black">{fmtBRL(suggested, 2)}</p>
                {study.adjustNote && <p className="text-xs text-gray-600">{study.adjustNote}</p>}
              </div>
            </div>
            <p className="mt-3 text-[11px] text-gray-500">Cenário em destaque = utilizado no Comparativo Final. {r.oldListings > 0 && `⚠ ${r.oldListings} amostra(s) anunciada(s) há mais de 180 dias – indício de preço especulativo. `}Valores de anúncio (oferta) podem diferir do valor efetivo de fechamento.</p>
          </div>
        </Slide>
      )}

      {/* Comparativo final */}
      {r && r.nValid > 0 && (
        <Slide title="Comparativo final">
          <div className="rounded-lg bg-white p-6">
            <div className="flex items-start justify-between gap-6">
              <h3 className="text-xl font-bold uppercase">Valor sugerido para a {TRANS[study.transactionType ?? 'SALE'] ?? 'venda'} do imóvel</h3>
              <div className="grid grid-cols-2 gap-2 text-center text-white">
                <div className="space-y-2">
                  <div className="rounded bg-[#0f2452] px-5 py-2"><p className="text-[10px] uppercase tracking-wide">Valor otimista</p><p className="text-lg font-bold">{fmtBRL(r.values.optimistic)}</p></div>
                  <div className="rounded bg-[#0f2452] px-5 py-2"><p className="text-[10px] uppercase tracking-wide">Valor de mercado</p><p className="text-lg font-bold">{fmtBRL(r.values.market)}</p></div>
                </div>
                <div className="flex items-center rounded bg-[#0f2452] px-5"><div><p className="text-[10px] uppercase tracking-wide">Valor competitivo</p><p className="text-xl font-bold">{fmtBRL(r.values.competitive)}</p></div></div>
              </div>
            </div>
            {(() => {
              const bars: Array<[string, number | null, string]> = [
                ['Valor competitivo', r.perSqm.competitive, '#3a9d23'], ['Valor de mercado', r.perSqm.market, '#3a9d23'], ['Valor otimista', r.perSqm.optimistic, '#3a9d23'],
                ...samples.map((s, i) => [`Amostra ${i + 1}`, rowsStat.get(s.id)?.pricePerSqm ?? null, s.status === 'VALID' ? '#4b6a94' : '#b8c0cc'] as [string, number | null, string]),
              ]
              const max = Math.max(...bars.map(b => b[1] ?? 0), 1)
              return (
                <div className="mt-6 space-y-1.5">
                  {bars.map(([l, v, c]) => (
                    <div key={l} className="grid grid-cols-[160px_1fr] items-center gap-3 text-xs">
                      <span className="text-right font-bold text-gray-500">{l}</span>
                      <div className="h-5 rounded-r-full text-[11px] font-bold text-white" style={{ width: `${Math.max(8, ((v ?? 0) / max) * 100)}%`, background: c }}><span className="pl-3 leading-5">{fmtBRL(v)} m²</span></div>
                    </div>
                  ))}
                </div>
              )
            })()}
            <div className="mt-6 rounded border-l-4 border-[#f39c2b] bg-[#fff6e6] px-4 py-3 text-xs text-gray-800">
              <strong>RESSALVA:</strong> valores calculados pela média do R$/m² de imóveis <strong>anunciados</strong> ({r.nValid} amostras, base área privativa), refletindo o que o mercado oferta hoje na região. Preços de anúncio podem conter especulação do proprietário ou da imobiliária – indício comum são anúncios há muitos meses no portal{r.oldListings > 0 ? ` (${r.oldListings} amostra(s) nesta análise)` : ''}. O valor efetivo de negociação tende a ficar abaixo da média anunciada.
            </div>
          </div>
        </Slide>
      )}

      {/* Contracapa */}
      <Slide dark>
        <div className="grid grid-cols-[1fr_auto] items-center gap-8 py-6">
          <div className="flex items-center gap-8">
            {agent.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.avatarUrl} alt="" className="h-44 w-36 rounded-lg bg-white/10 object-contain" />
            )}
            <div>
              <p className="text-3xl font-bold">{hub.name}</p>
              {hub.creci && <p className="text-blue-100">{hub.creci}</p>}
              {(hub.companyLine || agent.companyCreci) && <p className="text-blue-100">{[hub.companyLine, agent.companyCreci ? `CRECI ${agent.companyCreci}` : null].filter(Boolean).join(' · ')}</p>}
              {hub.phone && <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-2 text-xl font-bold"><WhatsAppIcon className="h-5 w-5" />{hub.phone}</p>}
              <p className="mt-3 text-xs tracking-[0.2em] text-blue-200">PARCERIA GARANTIDA · TODOS GANHAM</p>
              <p className="mt-1 text-xs text-blue-200">{SITE_URL.replace(/^https?:\/\//, '')}</p>
            </div>
          </div>
          <div className="text-right"><p className="text-[10px] font-bold tracking-widest">IMÓVEIS</p><p className="text-4xl font-black leading-none">RE<span className="text-[#d31c2c]">/</span>MAX</p>{agent.company && <p className="text-sm font-semibold">{agent.company.replace(/re\/?max\s*/i, '')}</p>}</div>
        </div>
      </Slide>
    </div>
  )
}
