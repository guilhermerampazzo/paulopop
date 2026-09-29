'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NovoEmpreendimentoPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/empreendimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao criar')
        return
      }
      const data = await res.json()
      router.push(`/admin/empreendimentos/${data.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-16 bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold text-[#1e3a8a] mb-2">Novo Empreendimento</h1>
      <p className="text-sm text-gray-500 mb-6">Informe o nome para começar. Você poderá preencher todos os detalhes na próxima tela.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do empreendimento *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Residencial Parque das Flores"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            autoFocus
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading || !name.trim()}
            className="flex-1 px-4 py-2 bg-[#1e3a8a] text-white text-sm font-medium rounded-lg hover:bg-[#172554] transition-colors disabled:opacity-50">
            {loading ? 'Criando...' : 'Criar e editar'}
          </button>
        </div>
      </form>
    </div>
  )
}
