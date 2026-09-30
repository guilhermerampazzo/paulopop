'use client'

import { useState } from 'react'
import { ImportarRemaxClient } from './ImportarRemaxClient'
import { ImportarPortalClient } from './ImportarPortalClient'

const TABS = [['remax', 'RE/MAX'], ['link', 'Outros portais (link)'], ['texto', 'Colar texto']] as const

/** v1.4 — o importador ganhou duas abas: outros portais por link e texto colado. */
export function ImportarTabs() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('remax')
  return (
    <>
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1" role="tablist">
        {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${tab === k ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>)}
      </div>
      {tab === 'remax' && (
        <>
          <p className="text-sm text-gray-500 mb-4">Cole o link do anúncio em remax.com.br. O site copia fotos, preço, endereço, descrição, ficha e características, e publica o imóvel. Se o mesmo anúncio já foi importado, ele é atualizado.</p>
          <ImportarRemaxClient />
        </>
      )}
      {tab === 'link' && (
        <>
          <p className="text-sm text-gray-500 mb-4">DF Imóveis, WImóveis, OLX, VivaReal, ZAP, Imovelweb e Chaves na Mão. O site lê o anúncio, você confere e o cadastro entra como rascunho. Se o portal bloquear a leitura, aparece a caixa para colar o texto.</p>
          <ImportarPortalClient key="link" mode="link" />
        </>
      )}
      {tab === 'texto' && (
        <>
          <p className="text-sm text-gray-500 mb-4">Copie o anúncio (de um portal, do WhatsApp ou de uma ficha) e cole aqui. O site identifica preço, áreas, quartos, vagas e endereço; o que não encontrar fica vazio para você preencher.</p>
          <ImportarPortalClient key="texto" mode="texto" />
        </>
      )}
    </>
  )
}
