'use client'

/**
 * v1.3 — formulários dos tipos simples: texto, galeria, vídeo, chamada para ação, FAQ e blog.
 */
import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Plus } from 'lucide-react'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import type { SectionText, SectionGallery, SectionVideo, SectionCta, SectionFaq, SectionBlog, MediaImage } from '@/lib/sections'
import { Checkbox, ImageUpload, RowControls, Select, TextArea, TextInput, btnSmall, inputCls, moveItem, newId, removeAt, updateAt, uploadFile } from './shared'

export function TextForm({ section, onChange }: { section: SectionText; onChange: (s: SectionText) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <span className="block text-xs font-medium text-gray-700 mb-1">Texto</span>
        <RichTextEditor value={section.html} onChange={html => onChange({ ...section, html })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ImageUpload label="Imagem ao lado do texto (opcional)" value={section.imageUrl} onChange={imageUrl => onChange({ ...section, imageUrl })} />
        <Select label="Posição da imagem" value={section.imagePosition ?? 'right'} onChange={v => onChange({ ...section, imagePosition: v as SectionText['imagePosition'] })}
          options={[{ value: 'right', label: 'À direita' }, { value: 'left', label: 'À esquerda' }, { value: 'top', label: 'Acima do texto' }]} />
      </div>
    </div>
  )
}

export function GalleryForm({ section, onChange }: { section: SectionGallery; onChange: (s: SectionGallery) => void }) {
  const [busy, setBusy] = useState(0)
  const [err, setErr] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const images = section.images ?? []

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setErr('')
    let current = images
    for (const file of files) {
      setBusy(b => b + 1)
      try {
        const { url } = await uploadFile(file)
        current = [...current, { url }]
        onChange({ ...section, images: current })
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : 'Falha no upload')
      } finally {
        setBusy(b => b - 1)
      }
    }
    if (ref.current) ref.current.value = ''
  }

  const set = (imgs: MediaImage[]) => onChange({ ...section, images: imgs })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Select label="Layout" value={section.layout ?? 'grid'} onChange={v => onChange({ ...section, layout: v as SectionGallery['layout'] })}
          options={[{ value: 'grid', label: 'Grade' }, { value: 'carousel', label: 'Carrossel' }, { value: 'masonry', label: 'Mosaico' }]} className="w-40" />
        <label htmlFor={`gal-${section.id}`} className={`${btnSmall} cursor-pointer py-2`}>
          {busy > 0 ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />} Enviar imagens
        </label>
        <input id={`gal-${section.id}`} ref={ref} type="file" accept="image/*" multiple className="sr-only" onChange={handleFiles} />
        {busy > 0 && <span className="text-xs text-gray-500">Enviando {busy}…</span>}
      </div>
      {err && <p className="text-[11px] text-red-600">{err}</p>}
      {images.length === 0 ? (
        <p className="text-xs text-gray-500">Nenhuma imagem ainda.</p>
      ) : (
        <ul className="space-y-2">
          {images.map((img, i) => (
            <li key={`${img.url}-${i}`} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-gray-200 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-20 h-14 rounded object-cover bg-gray-100 flex-shrink-0" />
              <input aria-label={`Legenda da imagem ${i + 1}`} value={img.caption ?? ''} onChange={e => set(updateAt(images, i, { caption: e.target.value }))} placeholder="Legenda" className={inputCls} />
              <RowControls index={i} total={images.length} onMove={d => set(moveItem(images, i, d))} onRemove={() => set(removeAt(images, i))} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function VideoForm({ section, onChange }: { section: SectionVideo; onChange: (s: SectionVideo) => void }) {
  return (
    <div className="space-y-3">
      <TextInput label="URL do vídeo (YouTube, Shorts ou youtu.be)" value={section.url} onChange={url => onChange({ ...section, url })} placeholder="https://www.youtube.com/watch?v=…" />
      <TextInput label="Legenda (opcional)" value={section.caption} onChange={caption => onChange({ ...section, caption })} />
      <Checkbox label="Vídeo vertical (Shorts / Reels)" checked={!!section.vertical} onChange={vertical => onChange({ ...section, vertical })} />
    </div>
  )
}

export function CtaForm({ section, onChange }: { section: SectionCta; onChange: (s: SectionCta) => void }) {
  return (
    <div className="space-y-3">
      <TextArea label="Texto" value={section.text} onChange={text => onChange({ ...section, text })} rows={2} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextInput label="Rótulo do botão" value={section.buttonLabel} onChange={buttonLabel => onChange({ ...section, buttonLabel })} placeholder="Falar no WhatsApp" />
        <Select label="Estilo" value={section.style ?? 'orange'} onChange={v => onChange({ ...section, style: v as SectionCta['style'] })}
          options={[{ value: 'orange', label: 'Laranja' }, { value: 'blue', label: 'Azul-marinho' }, { value: 'light', label: 'Claro' }]} />
      </div>
      <TextInput label="Mensagem do WhatsApp" value={section.whatsappMessage} onChange={whatsappMessage => onChange({ ...section, whatsappMessage })} placeholder="Olá! Quero vender meu imóvel em…" />
      <Checkbox label="Mostrar formulário de contato" checked={!!section.showForm} onChange={showForm => onChange({ ...section, showForm })} />
    </div>
  )
}

export function FaqForm({ section, onChange }: { section: SectionFaq; onChange: (s: SectionFaq) => void }) {
  const entries = section.entries ?? []
  const set = (e: SectionFaq['entries']) => onChange({ ...section, entries: e })
  return (
    <div className="space-y-2">
      {entries.map((e, i) => (
        <div key={e.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <TextInput label={`Pergunta ${i + 1}`} value={e.question} onChange={question => set(updateAt(entries, i, { question }))} className="flex-1 min-w-0" />
            <div className="pt-5"><RowControls index={i} total={entries.length} onMove={d => set(moveItem(entries, i, d))} onRemove={() => set(removeAt(entries, i))} /></div>
          </div>
          <TextArea label="Resposta" value={e.answer} onChange={answer => set(updateAt(entries, i, { answer }))} rows={3} />
        </div>
      ))}
      <button type="button" onClick={() => set([...entries, { id: newId(), question: '', answer: '' }])} className={btnSmall}><Plus className="w-3 h-3" /> Adicionar pergunta</button>
    </div>
  )
}

export function BlogForm({ section, onChange }: { section: SectionBlog; onChange: (s: SectionBlog) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <TextInput label="Slug da cidade (citySlug)" value={section.citySlug} onChange={citySlug => onChange({ ...section, citySlug })} placeholder="samambaia" hint="Posts com este citySlug." />
      <TextInput label="Tag" value={section.tag} onChange={tag => onChange({ ...section, tag })} placeholder="financiamento" />
      <TextInput label="Limite" type="number" value={String(section.limit ?? 3)} onChange={v => onChange({ ...section, limit: Math.max(1, Math.min(12, parseInt(v) || 3)) })} />
    </div>
  )
}
