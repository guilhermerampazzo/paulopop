import { ImportarTabs } from './ImportarTabs'

export const metadata = { title: 'Importar anúncio' }

export default function ImportarPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1e3a8a]">Importar anúncio</h1>
      <p className="text-sm text-gray-500 mt-1 mb-5">Por link da RE/MAX, por link de outros portais ou colando o texto do anúncio.</p>
      <ImportarTabs />
    </div>
  )
}
