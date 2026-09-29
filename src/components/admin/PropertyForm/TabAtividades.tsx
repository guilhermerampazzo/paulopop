'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/formatters'

interface Activity {
  id?: string
  type: string
  description: string
  createdAt?: string
  user?: { name: string }
}

interface TabAtividadesProps {
  activities: Activity[]
  propertyId: string
}

const ACTIVITY_ICONS: Record<string, string> = {
  PROPERTY_CREATED: '🏠',
  PROPERTY_UPDATED: '✏️',
  PROPERTY_PUBLISHED: '🚀',
  PROPERTY_SOLD: '🎉',
  LEAD_RECEIVED: '👤',
  LEAD_CONTACTED: '📞',
  VISIT_SCHEDULED: '📅',
  VISIT_DONE: '✅',
  DOCUMENT_ADDED: '📄',
  IMAGE_ADDED: '🖼️',
  ANALYSIS_GENERATED: '📊',
  NOTE_ADDED: '📝',
}

export function TabAtividades({ activities, propertyId }: TabAtividadesProps) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const addNote = async () => {
    if (!note.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/imoveis/${propertyId}/atividades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'NOTE_ADDED', description: note }),
      })
      setNote('')
    } catch {
      // ignorar erro silenciosamente
    }
    setSaving(false)
  }

  return (
    <div className="py-4 space-y-6">
      {/* Adicionar nota */}
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Adicionar Nota</p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Registre uma observação, visita ou contato..."
          aria-label="Nova nota"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
        <div className="flex justify-end mt-2">
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            onClick={addNote}
            aria-label="Salvar nota"
          >
            Salvar Nota
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma atividade registrada.</p>
        ) : (
          <div className="space-y-4">
            {activities.map((act, i) => (
              <div key={act.id ?? i} className="flex gap-3">
                <div className="shrink-0 w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-base">
                  {ACTIVITY_ICONS[act.type] ?? '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{act.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {act.user && (
                      <span className="text-xs text-gray-500">{act.user.name}</span>
                    )}
                    {act.createdAt && (
                      <span className="text-xs text-gray-400">{formatDate(act.createdAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
