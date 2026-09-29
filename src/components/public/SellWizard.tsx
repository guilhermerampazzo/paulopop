'use client'

/** v1.3 — "Vender meu imóvel": formulário em etapas com avaliação online na hora. */
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Upload, MessageCircle, Building2 } from 'lucide-react'
import { trackEvent } from '@/components/public/Analytics'

interface EmpOpt { id: string; name: string; city: string | null; neighborhood: string | null }
interface Result { low: number | null; mid: number | null; high: number | null; sqm: number | null; basis: { count: number; scope: string }; buildingReport: { name: string; sold: number; avgDaysLabel: string | null; avgSqm: number | null } | null }

const brl = (v: number | null) => v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
const SCOPE: Record<string, string> = { predio: 'no mesmo prédio', bairro: 'no mesmo bairro', cidade: 'na mesma cidade' }

export function SellWizard({ cities, whatsapp }: { cities: string[]; whatsapp: string }) {
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ city: '', neighborhood: '', building: '', empreendimentoId: '', address: '', propertyType: 'Apartamento', transactionType: 'SALE', area: '', bedrooms: '2', suites: '1', parking: '1', condition: 'PARCIAL', floor: '', name: '', phone: '', email: '', consent: false })
  const [photos, setPhotos] = useState<string[]>([])
  const [emps, setEmps] = useState<EmpOpt[]>([])
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  useEffect(() => {
    if (f.building.trim().length < 2) { setEmps([]); return }
    const t = setTimeout(() => {
      fetch(`/api/empreendimentos?limit=8&q=${encodeURIComponent(f.building)}`).then(r => r.json()).then(d => setEmps((d.empreendimentos ?? []).map((e: EmpOpt) => ({ id: e.id, name: e.name, city: e.city, neighborhood: e.neighborhood })))).catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [f.building])

  async function upload(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files).slice(0, 6 - photos.length)) {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch('/api/upload', { method: 'POST', body: fd }).then(x => x.json()).catch(() => null)
      if (r?.url) setPhotos(p => [...p, r.url])
    }
  }

  async function submit() {
    setSending(true); setErr(null)
    try {
      const res = await fetch('/api/vender', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, area: Number(f.area), photos }) })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'Não foi possível enviar. Tente pelo WhatsApp.'); return }
      setResult(d); setStep(4)
      trackEvent('generate_lead', { source: 'avaliacao_online' })
    } finally { setSending(false) }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]'
  const label = 'block text-xs font-medium text-gray-600 mb-1'
  const canNext = step === 0 ? !!f.city : step === 1 ? Number(f.area) > 0 : step === 3 ? !!f.name && f.phone.replace(/\D/g, '').length >= 10 && f.consent : true
  const waText = result ? `Olá, Paulo! Fiz a avaliação online no site.\n${f.propertyType} ${f.transactionType === 'RENT' ? 'para alugar' : 'à venda'} em ${[f.neighborhood, f.city].filter(Boolean).join(' – ')}${f.building ? ` (${f.building})` : ''}, ${f.area} m², ${f.bedrooms} quartos.\nFaixa sugerida: ${brl(result.low)} a ${brl(result.high)}.\nQuero conversar sobre a venda.` : ''
  const waHref = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(waText)}` : '/contato'

  return (
    <div className="min-w-0 rounded-3xl bg-white p-5 md:p-8 shadow-lg">
      {step < 4 && (
        <ol className="mb-6 flex flex-wrap items-center gap-2 text-xs" aria-label="Etapas">
          {['Onde fica', 'O imóvel', 'Fotos', 'Contato'].map((s, i) => (
            <li key={s} className={`flex items-center gap-2 ${i <= step ? 'text-[#1e3a8a] font-semibold' : 'text-gray-400'}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${i <= step ? 'bg-[#1e3a8a] text-white' : 'bg-gray-200'}`}>{i + 1}</span>{s}{i < 3 && <span className="w-4 border-t border-gray-300" />}
            </li>
          ))}
        </ol>
      )}

      {step === 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <div><label htmlFor="sv-city" className={label}>Cidade / região *</label>
            <input id="sv-city" list="sv-cities" value={f.city} onChange={set('city')} className={inputCls} placeholder="Samambaia" />
            <datalist id="sv-cities">{cities.map(c => <option key={c} value={c} />)}</datalist></div>
          <div><label htmlFor="sv-nb" className={label}>Bairro / quadra</label><input id="sv-nb" value={f.neighborhood} onChange={set('neighborhood')} className={inputCls} placeholder="Samambaia Sul, QN 303" /></div>
          <div className="relative"><label htmlFor="sv-b" className={label}>Nome do prédio / condomínio</label>
            <input id="sv-b" value={f.building} onChange={e => setF(p => ({ ...p, building: e.target.value, empreendimentoId: '' }))} className={inputCls} placeholder="Ex.: Parque Riacho 21" autoComplete="off" />
            {emps.length > 0 && !f.empreendimentoId && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow">
                {emps.map(e => <li key={e.id}><button type="button" onClick={() => setF(p => ({ ...p, building: e.name, empreendimentoId: e.id, city: p.city || e.city || '', neighborhood: p.neighborhood || e.neighborhood || '' }))} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#eff6ff]"><Building2 className="h-4 w-4 text-[#2563eb]" /> {e.name} <span className="text-xs text-gray-400">{e.city}</span></button></li>)}
              </ul>
            )}
            {f.empreendimentoId && <p className="mt-1 text-xs text-green-700">Prédio reconhecido — o Paulo já tem histórico dele.</p>}
          </div>
          <div><label htmlFor="sv-addr" className={label}>Endereço (opcional)</label><input id="sv-addr" value={f.address} onChange={set('address')} className={inputCls} placeholder="Quadra, bloco, apto" /></div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-3">
          <div><label htmlFor="sv-type" className={label}>Tipo</label><select id="sv-type" value={f.propertyType} onChange={set('propertyType')} className={inputCls}>{['Apartamento', 'Casa', 'Cobertura', 'Kitnet', 'Terreno', 'Sala Comercial', 'Loja'].map(t => <option key={t}>{t}</option>)}</select></div>
          <div><label htmlFor="sv-tx" className={label}>Quero</label><select id="sv-tx" value={f.transactionType} onChange={set('transactionType')} className={inputCls}><option value="SALE">Vender</option><option value="RENT">Alugar</option></select></div>
          <div><label htmlFor="sv-area" className={label}>Área útil (m²) *</label><input id="sv-area" type="number" min={10} value={f.area} onChange={set('area')} className={inputCls} placeholder="62" /></div>
          <div><label htmlFor="sv-bed" className={label}>Quartos</label><input id="sv-bed" type="number" min={0} value={f.bedrooms} onChange={set('bedrooms')} className={inputCls} /></div>
          <div><label htmlFor="sv-su" className={label}>Suítes</label><input id="sv-su" type="number" min={0} value={f.suites} onChange={set('suites')} className={inputCls} /></div>
          <div><label htmlFor="sv-pk" className={label}>Vagas</label><input id="sv-pk" type="number" min={0} value={f.parking} onChange={set('parking')} className={inputCls} /></div>
          <div><label htmlFor="sv-cond" className={label}>Estado</label><select id="sv-cond" value={f.condition} onChange={set('condition')} className={inputCls}><option value="ORIGINAL">Original (sem reforma)</option><option value="PARCIAL">Reformado em parte</option><option value="TOTAL">Reformado por completo</option></select></div>
          <div><label htmlFor="sv-floor" className={label}>Andar</label><input id="sv-floor" value={f.floor} onChange={set('floor')} className={inputCls} placeholder="3º" /></div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-sm text-gray-600 mb-3">Fotos ajudam o Paulo a afinar a avaliação (opcional, até 6).</p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-8 text-sm text-gray-500 hover:border-[#2563eb]">
            <Upload className="mb-2 h-6 w-6 text-[#2563eb]" /> Escolher fotos
            <input type="file" accept="image/*" multiple className="sr-only" onChange={e => upload(e.target.files)} />
          </label>
          {photos.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">{photos.map(p => /* eslint-disable-next-line @next/next/no-img-element */ <img key={p} src={p} alt="" className="aspect-square rounded-lg object-cover" />)}</div>}
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4 md:grid-cols-2">
          <div><label htmlFor="sv-name" className={label}>Seu nome *</label><input id="sv-name" value={f.name} onChange={set('name')} className={inputCls} /></div>
          <div><label htmlFor="sv-phone" className={label}>WhatsApp *</label><input id="sv-phone" value={f.phone} onChange={set('phone')} className={inputCls} placeholder="(61) 99999-9999" inputMode="tel" /></div>
          <div className="md:col-span-2"><label htmlFor="sv-email" className={label}>E-mail (opcional)</label><input id="sv-email" type="email" value={f.email} onChange={set('email')} className={inputCls} /></div>
          <label className="md:col-span-2 flex items-start gap-2 text-xs text-gray-600"><input type="checkbox" checked={f.consent} onChange={set('consent')} className="mt-0.5" /> Concordo com a <a href="/politica-de-privacidade" className="underline">Política de Privacidade</a>. Seus dados são usados só para responder ao seu pedido de avaliação.</label>
        </div>
      )}

      {step === 4 && result && (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
          {result.basis.scope === 'insuficiente' ? (
            <>
              <h3 className="mt-3 font-display text-2xl font-bold text-[#1e3a8a]">Recebemos o seu pedido</h3>
              <p className="mt-2 text-gray-600">Ainda não temos amostras suficientes desta região no site — o Paulo vai avaliar pessoalmente e responder no seu WhatsApp.</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-[#ea580c] uppercase tracking-wide text-xs font-semibold">Faixa estimada de {f.transactionType === 'RENT' ? 'aluguel' : 'venda'}</p>
              <h3 className="font-display text-3xl md:text-4xl font-bold text-[#1e3a8a]">Entre {brl(result.low)} e {brl(result.high)}</h3>
              <p className="mt-2 text-sm text-gray-600">Com base em {result.basis.count} anúncios {SCOPE[result.basis.scope] ?? ''} · R$ {result.sqm?.toLocaleString('pt-BR')}/m². É uma estimativa: o valor final depende da vistoria e do estudo de mercado completo.</p>
            </>
          )}
          {result.buildingReport && (
            <div className="mx-auto mt-5 max-w-md rounded-2xl bg-[#eff6ff] p-4 text-left text-sm">
              <p className="font-semibold text-[#1e3a8a]">Relatório do prédio — {result.buildingReport.name}</p>
              <p className="text-gray-700">{result.buildingReport.sold} unidade(s) negociada(s) por Paulo Pop{result.buildingReport.avgDaysLabel ? ` · tempo médio ${result.buildingReport.avgDaysLabel}` : ''}{result.buildingReport.avgSqm ? ` · R$ ${result.buildingReport.avgSqm.toLocaleString('pt-BR')}/m² vendido` : ''}.</p>
            </div>
          )}
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-semibold text-white hover:bg-[#1ebe5d]"><MessageCircle className="h-5 w-5" /> Enviar pelo WhatsApp e agendar a avaliação</a>
        </div>
      )}

      {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      {step < 4 && (
        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex items-center gap-1 text-sm text-gray-500 disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Voltar</button>
          {step < 3
            ? <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext} className="inline-flex items-center gap-2 rounded-full bg-[#ea580c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#c2410c] disabled:opacity-50">Continuar <ArrowRight className="h-4 w-4" /></button>
            : <button type="button" onClick={submit} disabled={!canNext || sending} className="inline-flex items-center gap-2 rounded-full bg-[#ea580c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#c2410c] disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Ver minha avaliação</button>}
        </div>
      )}
    </div>
  )
}
