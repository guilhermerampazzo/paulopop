'use client'

/**
 * v1.3 — peças compartilhadas pelos formulários do editor de seções:
 * classes de input, upload de imagem, campos rotulados e controles de lista (subir/descer/remover).
 */
import { useId, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2, X } from 'lucide-react'
import { newId } from '@/lib/sections'

export const inputCls = 'w-full min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white'
export const btnPrimary = 'inline-flex items-center gap-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50'
export const btnSecondary = 'inline-flex items-center gap-2 border border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#eff6ff] rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50'
export const btnSmall = 'inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40'

/** Envia um arquivo para /api/upload e devolve a URL. */
export async function uploadFile(file: File): Promise<{ url: string; thumbnailUrl?: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Falha no upload')
  return { url: data.url as string, thumbnailUrl: data.thumbnailUrl as string | undefined }
}

export function Field({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <div className={className}>
      <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  )
}

export function TextInput({ label, value, onChange, placeholder, type = 'text', hint, className }: {
  label: string; value: string | undefined; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string; className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input id={id} type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  )
}

export function TextArea({ label, value, onChange, placeholder, rows = 3, className }: {
  label: string; value: string | undefined; onChange: (v: string) => void; placeholder?: string; rows?: number; className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <textarea id={id} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={inputCls} />
    </div>
  )
}

export function Select({ label, value, onChange, options, className }: {
  label: string; value: string | undefined; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <select id={id} value={value ?? ''} onChange={e => onChange(e.target.value)} className={inputCls}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <label htmlFor={id} className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="rounded border-gray-300 text-[#1e3a8a] focus:ring-[#2563eb]" />
      {label}
    </label>
  )
}

/** Upload de uma imagem com pré-visualização e botão de remover. */
export function ImageUpload({ label = 'Imagem', value, onChange, small }: { label?: string; value?: string; onChange: (url: string | undefined) => void; small?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const id = useId()

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setErr('')
    try {
      const { url } = await uploadFile(file)
      onChange(url)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Falha no upload')
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }

  return (
    <div>
      <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
      <div className="flex items-center gap-3">
        {value ? (
          <div className={`relative ${small ? 'w-16 h-16' : 'w-28 h-20'} rounded-lg overflow-hidden bg-gray-100 flex-shrink-0`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => onChange(undefined)} aria-label="Remover imagem" className="absolute top-1 right-1 rounded-full bg-white/90 p-0.5 text-red-600 shadow">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : null}
        <label htmlFor={id} className={`${btnSmall} cursor-pointer`}>
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />} {value ? 'Trocar' : 'Enviar imagem'}
        </label>
        <input id={id} ref={ref} type="file" accept="image/*" className="sr-only" onChange={handle} disabled={busy} />
      </div>
      {err && <p className="mt-1 text-[11px] text-red-600">{err}</p>}
    </div>
  )
}

/** Barra de controles de um item em lista: subir, descer, remover. */
export function RowControls({ index, total, onMove, onRemove }: { index: number; total: number; onMove: (dir: -1 | 1) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Mover para cima" className={btnSmall}><ArrowUp className="w-3 h-3" /></button>
      <button type="button" onClick={() => onMove(1)} disabled={index >= total - 1} aria-label="Mover para baixo" className={btnSmall}><ArrowDown className="w-3 h-3" /></button>
      <button type="button" onClick={onRemove} aria-label="Remover" className={`${btnSmall} text-red-600 border-red-200 hover:bg-red-50`}><Trash2 className="w-3 h-3" /></button>
    </div>
  )
}

/** Utilitários de lista imutável. */
export function moveItem<T>(arr: T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir
  if (j < 0 || j >= arr.length) return arr
  const copy = arr.slice()
  const [it] = copy.splice(index, 1)
  copy.splice(j, 0, it)
  return copy
}
export function updateAt<T>(arr: T[], index: number, patch: Partial<T>): T[] {
  return arr.map((x, i) => (i === index ? { ...x, ...patch } : x))
}
export function removeAt<T>(arr: T[], index: number): T[] {
  return arr.filter((_, i) => i !== index)
}
export { newId }
