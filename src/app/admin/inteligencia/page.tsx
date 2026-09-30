import { getSessionUser, isAdmin } from '@/lib/authz'
import { InteligenciaClient } from './InteligenciaClient'

export const metadata = { title: 'Inteligência' }
export const dynamic = 'force-dynamic'

/** v1.4 — Área de Inteligência: endereços por quadra, banco de amostras, buscas, regiões e conector do Claude. */
export default async function InteligenciaPage({ searchParams }: { searchParams: { aba?: string } }) {
  const user = await getSessionUser()
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1e3a8a]">Inteligência</h1>
      <p className="text-sm text-gray-500 mt-1 mb-5">A base que orienta a pesquisa de amostras: endereços por quadra, anúncios já lidos, onde já se procurou e a ligação com o Claude.</p>
      <InteligenciaClient admin={isAdmin(user)} initialTab={searchParams.aba} />
    </div>
  )
}
