'use client'

/**
 * v1.3 — formulários dos tipos em lista: itens, linha do tempo, pessoas, números e mapa.
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import type { SectionItems, SectionTimeline, SectionPeople, SectionStats, SectionMap, ItemEntry, MediaImage } from '@/lib/sections'
import { ImageUpload, RowControls, Select, TextArea, TextInput, btnSmall, inputCls, moveItem, newId, removeAt, updateAt } from './shared'

function ItemRow({ item, index, total, onChange, onMove, onRemove }: {
  item: ItemEntry; index: number; total: number; onChange: (p: Partial<ItemEntry>) => void; onMove: (d: -1 | 1) => void; onRemove: () => void
}) {
  const [open, setOpen] = useState(!item.title)
  const extras = item.images ?? []
  const setExtras = (images: MediaImage[]) => onChange({ images })
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen(o => !o)} aria-label={open ? 'Recolher item' : 'Expandir item'} aria-expanded={open} className="text-gray-500">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="w-8 h-8 rounded object-cover bg-gray-100" />
        )}
        <input aria-label={`Título do item ${index + 1}`} value={item.title} onChange={e => onChange({ title: e.target.value })} placeholder="Título do item" className={inputCls} />
        <RowControls index={index} total={total} onMove={onMove} onRemove={onRemove} />
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          <TextArea label="Texto" value={item.text} onChange={text => onChange({ text })} rows={3} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ImageUpload label="Foto" value={item.imageUrl} onChange={imageUrl => onChange({ imageUrl })} />
            <TextInput label="Selo (ex.: Parque, Escola pública)" value={item.badge} onChange={badge => onChange({ badge })} />
            <TextInput label="Link" value={item.link} onChange={link => onChange({ link })} placeholder="https://…" />
            <TextInput label="Telefone" value={item.phone} onChange={phone => onChange({ phone })} placeholder="(61) 9…" />
            <TextInput label="Endereço" value={item.address} onChange={address => onChange({ address })} className="sm:col-span-2" hint="Vira link para o Google Maps automaticamente." />
            <TextInput label="Vídeo (YouTube)" value={item.videoUrl} onChange={videoUrl => onChange({ videoUrl })} placeholder="https://youtu.be/…" className="sm:col-span-2" />
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-700 mb-1">Imagens extras</span>
            <div className="space-y-2">
              {extras.map((img, i) => (
                <div key={`${img.url}-${i}`} className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="w-12 h-10 rounded object-cover bg-gray-100" />
                  <input aria-label={`Legenda da imagem extra ${i + 1}`} value={img.caption ?? ''} onChange={e => setExtras(updateAt(extras, i, { caption: e.target.value }))} placeholder="Legenda" className={inputCls} />
                  <RowControls index={i} total={extras.length} onMove={d => setExtras(moveItem(extras, i, d))} onRemove={() => setExtras(removeAt(extras, i))} />
                </div>
              ))}
              <ImageUpload label="Adicionar imagem extra" value={undefined} onChange={url => { if (url) setExtras([...extras, { url }]) }} small />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ItemsForm({ section, onChange }: { section: SectionItems; onChange: (s: SectionItems) => void }) {
  const items = section.items ?? []
  const set = (i: ItemEntry[]) => onChange({ ...section, items: i })
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <Select label="Layout" value={section.layout ?? 'cards'} onChange={v => onChange({ ...section, layout: v as SectionItems['layout'] })}
          options={[{ value: 'cards', label: 'Cartões' }, { value: 'list', label: 'Lista compacta' }]} />
        <Select label="Colunas" value={String(section.columns ?? 3)} onChange={v => onChange({ ...section, columns: Number(v) as SectionItems['columns'] })}
          options={[{ value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }]} />
      </div>
      {items.map((it, i) => (
        <ItemRow key={it.id} item={it} index={i} total={items.length}
          onChange={p => set(updateAt(items, i, p))} onMove={d => set(moveItem(items, i, d))} onRemove={() => set(removeAt(items, i))} />
      ))}
      <button type="button" onClick={() => set([...items, { id: newId(), title: '' }])} className={btnSmall}><Plus className="w-3 h-3" /> Adicionar item</button>
    </div>
  )
}

export function TimelineForm({ section, onChange }: { section: SectionTimeline; onChange: (s: SectionTimeline) => void }) {
  const entries = section.entries ?? []
  const set = (e: SectionTimeline['entries']) => onChange({ ...section, entries: e })
  return (
    <div className="space-y-2">
      {entries.map((e, i) => (
        <div key={e.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <TextInput label="Ano" value={e.year} onChange={year => set(updateAt(entries, i, { year }))} className="w-24 flex-shrink-0" />
            <TextInput label="Título" value={e.title} onChange={title => set(updateAt(entries, i, { title }))} className="flex-1 min-w-0" />
            <div className="pt-5"><RowControls index={i} total={entries.length} onMove={d => set(moveItem(entries, i, d))} onRemove={() => set(removeAt(entries, i))} /></div>
          </div>
          <TextArea label="Texto" value={e.text} onChange={text => set(updateAt(entries, i, { text }))} rows={2} />
          <ImageUpload label="Imagem (opcional)" value={e.imageUrl} onChange={imageUrl => set(updateAt(entries, i, { imageUrl }))} small />
        </div>
      ))}
      <button type="button" onClick={() => set([...entries, { id: newId(), year: '', title: '' }])} className={btnSmall}><Plus className="w-3 h-3" /> Adicionar marco</button>
    </div>
  )
}

export function PeopleForm({ section, onChange }: { section: SectionPeople; onChange: (s: SectionPeople) => void }) {
  const people = section.people ?? []
  const set = (p: SectionPeople['people']) => onChange({ ...section, people: p })
  return (
    <div className="space-y-2">
      {people.map((p, i) => (
        <div key={p.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <TextInput label="Nome" value={p.name} onChange={name => set(updateAt(people, i, { name }))} className="flex-1 min-w-0" />
            <div className="pt-5"><RowControls index={i} total={people.length} onMove={d => set(moveItem(people, i, d))} onRemove={() => set(removeAt(people, i))} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <TextInput label="Cargo" value={p.role} onChange={role => set(updateAt(people, i, { role }))} placeholder="Governador, administrador regional…" />
            <TextInput label="Período" value={p.period} onChange={period => set(updateAt(people, i, { period }))} placeholder="1991–1995" />
            <TextInput label="Link (opcional)" value={p.link} onChange={link => set(updateAt(people, i, { link }))} className="sm:col-span-2" />
          </div>
          <TextArea label="Texto" value={p.text} onChange={text => set(updateAt(people, i, { text }))} rows={2} />
          <ImageUpload label="Foto" value={p.imageUrl} onChange={imageUrl => set(updateAt(people, i, { imageUrl }))} small />
        </div>
      ))}
      <button type="button" onClick={() => set([...people, { id: newId(), name: '' }])} className={btnSmall}><Plus className="w-3 h-3" /> Adicionar pessoa</button>
    </div>
  )
}

export function StatsForm({ section, onChange }: { section: SectionStats; onChange: (s: SectionStats) => void }) {
  const stats = section.stats ?? []
  const set = (s: SectionStats['stats']) => onChange({ ...section, stats: s })
  return (
    <div className="space-y-2">
      {stats.map((s, i) => (
        <div key={s.id} className="flex flex-col sm:flex-row sm:items-end gap-2 rounded-lg border border-gray-200 p-3">
          <TextInput label="Rótulo" value={s.label} onChange={label => set(updateAt(stats, i, { label }))} className="flex-1 min-w-0" placeholder="População" />
          <TextInput label="Valor" value={s.value} onChange={value => set(updateAt(stats, i, { value }))} className="sm:w-36" placeholder="245 mil" />
          <TextInput label="Fonte" value={s.source} onChange={source => set(updateAt(stats, i, { source }))} className="flex-1 min-w-0" placeholder="PDAD 2021" />
          <div className="sm:pb-1"><RowControls index={i} total={stats.length} onMove={d => set(moveItem(stats, i, d))} onRemove={() => set(removeAt(stats, i))} /></div>
        </div>
      ))}
      <button type="button" onClick={() => set([...stats, { id: newId(), label: '', value: '' }])} className={btnSmall}><Plus className="w-3 h-3" /> Adicionar número</button>
    </div>
  )
}

export function MapForm({ section, onChange }: { section: SectionMap; onChange: (s: SectionMap) => void }) {
  const pins = section.pins ?? []
  const set = (p: SectionMap['pins']) => onChange({ ...section, pins: p })
  return (
    <div className="space-y-3">
      <TextInput label="URL do embed do Google Maps" value={section.embedUrl} onChange={embedUrl => onChange({ ...section, embedUrl })}
        placeholder="https://www.google.com/maps/embed?pb=…" hint="No Google Maps: Compartilhar → Incorporar um mapa → copie só o endereço do src." />
      <TextArea label="Texto de apoio (opcional)" value={section.text} onChange={text => onChange({ ...section, text })} rows={2} />
      <div>
        <span className="block text-xs font-medium text-gray-700 mb-1">Pinos / pontos de interesse</span>
        <div className="space-y-2">
          {pins.map((p, i) => (
            <div key={p.id} className="flex flex-col sm:flex-row sm:items-end gap-2 rounded-lg border border-gray-200 p-3">
              <TextInput label="Nome" value={p.name} onChange={name => set(updateAt(pins, i, { name }))} className="flex-1 min-w-0" />
              <TextInput label="Endereço" value={p.address} onChange={address => set(updateAt(pins, i, { address }))} className="flex-1 min-w-0" />
              <TextInput label="Categoria" value={p.category} onChange={category => set(updateAt(pins, i, { category }))} className="sm:w-32" placeholder="Escola" />
              <div className="sm:pb-1"><RowControls index={i} total={pins.length} onMove={d => set(moveItem(pins, i, d))} onRemove={() => set(removeAt(pins, i))} /></div>
            </div>
          ))}
          <button type="button" onClick={() => set([...pins, { id: newId(), name: '' }])} className={btnSmall}><Plus className="w-3 h-3" /> Adicionar pino</button>
        </div>
      </div>
    </div>
  )
}
