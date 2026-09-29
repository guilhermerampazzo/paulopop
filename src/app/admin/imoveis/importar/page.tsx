import { ImportarRemaxClient } from './ImportarRemaxClient'

export const metadata = { title: 'Importar da RE/MAX' }

export default function ImportarRemaxPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1e3a8a]">Importar anúncio da RE/MAX</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Cole o link do anúncio em remax.com.br. O site copia fotos, preço, endereço, descrição, ficha e
        características, e publica o imóvel. Se o mesmo anúncio já foi importado, ele é atualizado.
      </p>
      <ImportarRemaxClient />
    </div>
  )
}
