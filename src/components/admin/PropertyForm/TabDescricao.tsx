'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Bot, Sparkles } from 'lucide-react'

interface TabDescricaoProps {
  data: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
}

export function TabDescricao({ data, onChange }: TabDescricaoProps) {
  const [lang, setLang] = useState<'pt' | 'en'>('pt')
  const [generating, setGenerating] = useState<string | null>(null)

  const generateWithAI = async (field: string) => {
    setGenerating(field)
    try {
      const res = await fetch('/api/ai/gerar-descricao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      const result = await res.json()
      // Preenche campos PT-BR
      if (result.title) onChange('title', result.title)
      if (result.description) onChange('description', result.description)
      if (result.marketingDescription) onChange('marketingDescription', result.marketingDescription)
      if (result.surroundingsInfo) onChange('surroundingsInfo', result.surroundingsInfo)
      // Preenche campos EN
      if (result.titleEn) onChange('titleEn', result.titleEn)
      if (result.descriptionEn) onChange('descriptionEn', result.descriptionEn)
    } catch {
      alert('Erro ao gerar com IA. Verifique se a ANTHROPIC_API_KEY está configurada.')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-6 py-4">
      {/* AI Text Toolkit Banner */}
      <div
        className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:opacity-95 transition-opacity"
        onClick={() => generateWithAI('all')}
      >
        <div className="bg-white/20 p-3 rounded-xl">
          <Bot className="text-white" size={28} aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold text-lg">AI Text Toolkit</h3>
          <p className="text-blue-200 text-sm mt-0.5">
            Gere título, descrição e textos de marketing automaticamente com IA baseada nos dados do imóvel.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          loading={generating === 'all'}
          className="bg-white/10 border-white/30 text-white hover:bg-white hover:text-[#1e3a8a]"
          aria-label="Gerar descrições com IA"
          onClick={e => { e.stopPropagation(); generateWithAI('all') }}
        >
          <Sparkles size={16} />
          Gerar com IA
        </Button>
      </div>

      {/* Language selector */}
      <div className="flex gap-1 border-b border-gray-200">
        {[{ id: 'pt', label: 'Português (Brasil)' }, { id: 'en', label: 'English' }].map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLang(l.id as 'pt' | 'en')}
            aria-pressed={lang === l.id}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              lang === l.id ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Fields */}
      {lang === 'pt' ? (
        <div className="space-y-4">
          <Input
            label="Título do Imóvel"
            id="title"
            value={(data.title as string) ?? ''}
            onChange={e => onChange('title', e.target.value)}
            placeholder="Ex: Apartamento moderno com vista privilegiada em São Paulo"
          />
          <Textarea
            label="Descrição do Portal"
            id="description"
            value={(data.description as string) ?? ''}
            onChange={e => onChange('description', e.target.value)}
            placeholder="Descrição completa do imóvel para publicação nos portais..."
            className="min-h-[180px]"
          />
          <Textarea
            label="Descrição de Marketing"
            id="marketingDescription"
            value={(data.marketingDescription as string) ?? ''}
            onChange={e => onChange('marketingDescription', e.target.value)}
            placeholder="Texto curto e impactante para anúncios e redes sociais..."
            maxLength={350}
            showCount
            className="min-h-[100px]"
          />
          <Textarea
            label="Localização e Informações dos Arredores"
            id="surroundingsInfo"
            value={(data.surroundingsInfo as string) ?? ''}
            onChange={e => onChange('surroundingsInfo', e.target.value)}
            placeholder="Descreva a localização, pontos de interesse, transporte, comércios próximos..."
            className="min-h-[120px]"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="Property Title (English)"
            id="titleEn"
            value={(data.titleEn as string) ?? ''}
            onChange={e => onChange('titleEn', e.target.value)}
            placeholder="Ex: Modern apartment with privileged view in São Paulo"
          />
          <Textarea
            label="Description (English)"
            id="descriptionEn"
            value={(data.descriptionEn as string) ?? ''}
            onChange={e => onChange('descriptionEn', e.target.value)}
            placeholder="Full property description in English..."
            className="min-h-[180px]"
          />
        </div>
      )}
    </div>
  )
}
