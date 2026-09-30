export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { Camera, Globe2, LineChart, Handshake, ShieldCheck } from 'lucide-react'
import { getSiteConfigCached, getActiveCitiesCached } from '@/lib/cache'
import { absUrl } from '@/lib/site'
import { SellWizard } from '@/components/public/SellWizard'
import { Testimonials } from '@/components/public/Testimonials'

export const metadata: Metadata = {
  title: 'Vender meu imóvel — avaliação online grátis', // v1.4: o sufixo "| Paulo Pop" vem do layout (antes saía duplicado)
  description: 'Descubra em 2 minutos a faixa de preço do seu apartamento ou casa no DF com base nos anúncios e vendas da região, e receba o relatório do seu prédio.',
  alternates: { canonical: absUrl('/vender') },
}

/** v1.3 — Página "Vender meu imóvel": avaliação online + como o Paulo vende. */
export default async function VenderPage() {
  const [config, cities] = await Promise.all([getSiteConfigCached(), getActiveCitiesCached().catch(() => [] as string[])])
  const whatsapp = config?.ownerWhatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP ?? ''
  const steps = [
    { icon: LineChart, title: 'Estudo de mercado', text: 'Comparação com anúncios e vendas reais da região e do seu prédio para chegar ao preço certo — nem abaixo, nem parado no portal.' },
    { icon: Camera, title: 'Fotos, vídeo e tour', text: 'Produção profissional do anúncio, com fotos por cômodo, vídeo vertical e, quando faz sentido, tour 360.' },
    { icon: Globe2, title: 'Portais e redes', text: 'Anúncio no site, nos maiores portais (DF Imóveis, WImóveis, ZAP, OLX) e nas redes sociais, com acompanhamento dos resultados.' },
    { icon: Handshake, title: 'Negociação e documentação', text: 'Filtro de compradores, visitas acompanhadas, negociação e apoio com financiamento e cartório até a entrega das chaves.' },
  ]
  const faq = [
    { q: 'A avaliação online é gratuita?', a: 'Sim. A faixa de preço é calculada na hora com os dados do site e não tem custo nem compromisso.' },
    { q: 'A faixa é o preço final?', a: 'Não. É uma estimativa inicial. O valor de anúncio é definido depois da visita e do estudo de mercado completo, com amostras dos portais.' },
    { q: 'Quanto custa vender com o Paulo?', a: 'A comissão é combinada no contrato de intermediação e só é paga quando a venda é concluída.' },
    { q: 'Vocês atendem quais regiões?', a: `Todo o Distrito Federal, com foco em ${cities.slice(0, 4).join(', ') || 'Samambaia, Taguatinga e Águas Claras'}.` },
  ]
  return (
    <>
      <section className="bg-gradient-to-br from-[#172554] via-[#1e3a8a] to-[#1e40af] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start">
          <div className="min-w-0">
            <p className="text-orange-300 uppercase tracking-wide text-xs font-semibold">Avaliação online grátis</p>
            <h1 className="mt-2 font-display text-3xl md:text-5xl font-bold leading-tight">Quanto vale o seu imóvel hoje?</h1>
            <p className="mt-4 text-blue-100 text-lg">Em 2 minutos você recebe uma faixa de preço com base nos anúncios e vendas da sua região — e, se o seu prédio já estiver no site, o relatório do prédio.</p>
            <ul className="mt-6 space-y-2 text-sm text-blue-100">
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-orange-300" /> Sem compromisso e sem custo</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-orange-300" /> Dados reais do site, não chute</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-orange-300" /> Resposta do Paulo no seu WhatsApp</li>
            </ul>
          </div>
          <SellWizard cities={cities} whatsapp={whatsapp} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <p className="text-[#ea580c] uppercase tracking-wide text-xs font-semibold">Como o Paulo vende</p>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-[#1e3a8a]">Do preço certo à entrega das chaves</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(s => (
            <div key={s.title} className="rounded-2xl bg-white p-5 shadow-sm">
              <s.icon className="h-6 w-6 text-[#2563eb]" />
              <h3 className="mt-3 font-semibold text-[#1e3a8a]">{s.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <Testimonials title="Proprietários que venderam com o Paulo" className="bg-[#eff6ff] py-14" />

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="font-display text-2xl font-bold text-[#1e3a8a]">Perguntas frequentes do proprietário</h2>
        <div className="mt-4 divide-y divide-gray-200 rounded-2xl bg-white shadow-sm">
          {faq.map(f => (
            <details key={f.q} className="group p-4">
              <summary className="cursor-pointer font-medium text-gray-800 list-none flex justify-between">{f.q}<span className="text-[#2563eb] group-open:rotate-45 transition">+</span></summary>
              <p className="mt-2 text-sm text-gray-600">{f.a}</p>
            </details>
          ))}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }) }} />
      </section>
    </>
  )
}
