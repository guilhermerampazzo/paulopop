export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/authz'
import { BellRing } from 'lucide-react'

/** v1.3 — Alertas de imóveis (avise-me se baixar o preço / novos imóveis) gravados pelo site. */
export default async function AlertasPage() {
  const user = await getSessionUser()
  if (!user) return null
  const alerts = await prisma.propertyAlert.findMany({ orderBy: { createdAt: 'desc' }, take: 300 })
  const kinds: Record<string, string> = { price_drop: 'Baixa de preço', new_listing: 'Novo imóvel', search: 'Busca salva' }
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1e3a8a] flex items-center gap-2"><BellRing className="h-4 w-4" /> Alertas cadastrados no site</h2>
        <p className="text-xs text-gray-500">Quem pediu para ser avisado quando o preço baixar ou surgir um imóvel. Use a lista para retornar pelo WhatsApp quando o caso acontecer.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="p-3">Data</th><th className="p-3">Nome</th><th className="p-3">WhatsApp</th><th className="p-3">Tipo</th><th className="p-3">Critério</th></tr></thead>
          <tbody>
            {alerts.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">Nenhum alerta ainda.</td></tr>}
            {alerts.map(a => {
              const c = (a.criteria ?? {}) as Record<string, unknown>
              const digits = a.phone.replace(/\D/g, '')
              return (
                <tr key={a.id} className="border-t border-gray-100">
                  <td className="p-3 whitespace-nowrap">{a.createdAt.toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">{a.name ?? '—'}{a.email ? <span className="block text-xs text-gray-400">{a.email}</span> : null}</td>
                  <td className="p-3"><a href={`https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`} target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline">{a.phone}</a></td>
                  <td className="p-3">{kinds[String(c.kind)] ?? String(c.kind ?? '—')}</td>
                  <td className="p-3 text-xs text-gray-600">{c.propertyRef ? `Imóvel ${c.propertyRef}` : ''}{c.priceAtSignup ? ` · preço na época R$ ${Number(c.priceAtSignup).toLocaleString('pt-BR')}` : ''}{c.city ? ` · ${c.city}` : ''}{c.text ? ` · ${c.text}` : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
