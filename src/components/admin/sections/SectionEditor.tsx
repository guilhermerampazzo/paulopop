'use client'

/**
 * v1.3 — Editor de seções reutilizável (Cidades, Parceiros, Blog).
 * Lista ordenada de seções tipadas (`src/lib/sections.ts`): adicionar, mover, duplicar,
 * remover, ocultar, recolher e um formulário por tipo (arquivos `forms-*.tsx`).
 */
import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Eye, EyeOff, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { SECTION_LABEL, emptySection, newId, type Section, type SectionType } from '@/lib/sections'
import { TextForm, GalleryForm, VideoForm, CtaForm, FaqForm, BlogForm } from './forms-basic'
import { ItemsForm, TimelineForm, PeopleForm, StatsForm, MapForm } from './forms-lists'
import { PropertiesForm, EmpreendimentosForm } from './forms-data'
import { TextInput, btnSmall, moveItem, removeAt } from './shared'

export interface SectionEditorContext {
  cityNames?: string[]
  /** Nome da página (cidade/parceiro) para dar contexto à IA. */
  pageName?: string
  /** Descrição curta do tipo de página ("página da cidade", "página do parceiro"). */
  pageKind?: string
}

export interface SectionEditorProps {
  value: Section[]
  onChange: (s: Section[]) => void
  context?: SectionEditorContext
}

const AI_TYPES: SectionType[] = ['text', 'faq', 'items']

/** Resumo em uma linha para a seção recolhida. */
export function sectionSummary(s: Section): string {
  const strip = (h?: string) => (h ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  switch (s.type) {
    case 'text': { const t = strip(s.html); return t ? t.slice(0, 110) + (t.length > 110 ? '…' : '') : 'Sem texto' }
    case 'gallery': return `${s.images?.length ?? 0} imagem(ns) · ${s.layout ?? 'grid'}`
    case 'video': return s.url || 'Sem URL'
    case 'items': return `${s.items?.length ?? 0} item(ns) · ${s.layout === 'list' ? 'lista' : 'cartões'}`
    case 'timeline': return `${s.entries?.length ?? 0} marco(s)`
    case 'people': return `${s.people?.length ?? 0} pessoa(s)`
    case 'stats': return `${s.stats?.length ?? 0} número(s)`
    case 'map': return `${s.embedUrl ? 'Mapa incorporado' : 'Sem embed'} · ${s.pins?.length ?? 0} pino(s)`
    case 'properties': return s.mode === 'manual' ? `${s.propertyIds?.length ?? 0} imóvel(is) escolhido(s)` : `Automático · ${(s.cityNames?.length ? s.cityNames.join(', ') : 'nomes da página')} · limite ${s.limit ?? 8}`
    case 'empreendimentos': return s.mode === 'manual' ? `${s.empreendimentoIds?.length ?? 0} escolhido(s)` : `Automático · ${(s.cityNames?.length ? s.cityNames.join(', ') : 'nomes da página')}`
    case 'cta': return `${s.buttonLabel ?? 'Botão'} · ${s.showForm ? 'com formulário' : 'sem formulário'} · ${s.style ?? 'orange'}`
    case 'faq': return `${s.entries?.length ?? 0} pergunta(s)`
    case 'blog': return `citySlug ${s.citySlug || '—'} · tag ${s.tag || '—'} · ${s.limit ?? 3} posts`
  }
}

function TypeForm({ section, onChange, context }: { section: Section; onChange: (s: Section) => void; context: SectionEditorContext }) {
  const cityNames = context.cityNames ?? []
  switch (section.type) {
    case 'text': return <TextForm section={section} onChange={onChange} />
    case 'gallery': return <GalleryForm section={section} onChange={onChange} />
    case 'video': return <VideoForm section={section} onChange={onChange} />
    case 'items': return <ItemsForm section={section} onChange={onChange} />
    case 'timeline': return <TimelineForm section={section} onChange={onChange} />
    case 'people': return <PeopleForm section={section} onChange={onChange} />
    case 'stats': return <StatsForm section={section} onChange={onChange} />
    case 'map': return <MapForm section={section} onChange={onChange} />
    case 'properties': return <PropertiesForm section={section} onChange={onChange} cityNames={cityNames} />
    case 'empreendimentos': return <EmpreendimentosForm section={section} onChange={onChange} cityNames={cityNames} />
    case 'cta': return <CtaForm section={section} onChange={onChange} />
    case 'faq': return <FaqForm section={section} onChange={onChange} />
    case 'blog': return <BlogForm section={section} onChange={onChange} />
  }
}

function SectionCard({ section, index, total, context, onChange, onMove, onDuplicate, onRemove }: {
  section: Section; index: number; total: number; context: SectionEditorContext
  onChange: (s: Section) => void; onMove: (d: -1 | 1) => void; onDuplicate: () => void; onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiMsg, setAiMsg] = useState('')
  const visible = section.visible !== false

  async function generateAi() {
    setAiBusy(true); setAiMsg('')
    try {
      const ctx = [context.pageKind, context.pageName, context.cityNames?.length ? `Nomes relacionados: ${context.cityNames.join(', ')}` : ''].filter(Boolean).join(' · ')
      const res = await fetch('/api/admin/ia/secao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: section.type, title: section.title, context: ctx }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? (res.status === 503 ? 'IA indisponível: configure a chave do Gemini.' : 'Falha ao gerar'))
      if (section.type === 'text' && data.type === 'text') onChange({ ...section, html: String(data.html ?? '') })
      else if (section.type === 'faq' && data.type === 'faq') onChange({ ...section, entries: [...(section.entries ?? []), ...(data.entries ?? [])] })
      else if (section.type === 'items' && data.type === 'items') onChange({ ...section, items: [...(section.items ?? []), ...(data.items ?? [])] })
      setAiMsg('Conteúdo gerado: revise antes de publicar.')
      setOpen(true)
    } catch (e) {
      setAiMsg(e instanceof Error ? e.message : 'Falha ao gerar com IA')
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div className={`rounded-xl border bg-white ${visible ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-70'}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={open ? 'Recolher seção' : 'Expandir seção'} className="text-gray-500 flex-shrink-0">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setOpen(o => !o)}>
          <p className="text-sm font-medium text-gray-800 truncate">
            <span className="text-[10px] uppercase tracking-wide text-[#ea580c] font-semibold mr-2">{SECTION_LABEL[section.type].split(' (')[0]}</span>
            {section.title || <span className="text-gray-400">Sem título</span>}
          </p>
          {!open && <p className="text-xs text-gray-500 truncate">{sectionSummary(section)}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button type="button" onClick={() => onChange({ ...section, visible: !visible })} aria-label={visible ? 'Ocultar seção' : 'Mostrar seção'} title={visible ? 'Ocultar' : 'Mostrar'} className={btnSmall}>
            {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Mover para cima" className={btnSmall}><ArrowUp className="w-3 h-3" /></button>
          <button type="button" onClick={() => onMove(1)} disabled={index >= total - 1} aria-label="Mover para baixo" className={btnSmall}><ArrowDown className="w-3 h-3" /></button>
          <button type="button" onClick={onDuplicate} aria-label="Duplicar seção" className={`${btnSmall} hidden sm:inline-flex`}><Copy className="w-3 h-3" /></button>
          <button type="button" onClick={() => { if (confirm('Remover esta seção?')) onRemove() }} aria-label="Remover seção" className={`${btnSmall} text-red-600 border-red-200 hover:bg-red-50`}><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 px-3 py-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextInput label="Título" value={section.title} onChange={title => onChange({ ...section, title })} className="sm:col-span-2" />
            <TextInput label="Âncora (índice lateral)" value={section.anchor} onChange={anchor => onChange({ ...section, anchor: anchor.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="historia" />
            <TextInput label="Subtítulo" value={section.subtitle} onChange={subtitle => onChange({ ...section, subtitle })} className="sm:col-span-3" />
          </div>
          {AI_TYPES.includes(section.type) && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={generateAi} disabled={aiBusy} className={`${btnSmall} border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#eff6ff]`}>
                {aiBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Gerar com IA
              </button>
              {aiMsg && <span className={`text-xs ${/indispon|Falha|erro/i.test(aiMsg) ? 'text-red-600' : 'text-green-700'}`}>{aiMsg}</span>}
            </div>
          )}
          <TypeForm section={section} onChange={onChange} context={context} />
        </div>
      )}
    </div>
  )
}

export function SectionEditor({ value, onChange, context = {} }: SectionEditorProps) {
  const [addOpen, setAddOpen] = useState(false)
  const sections = value ?? []

  const add = (type: SectionType) => {
    onChange([...sections, emptySection(type)])
    setAddOpen(false)
  }
  const duplicate = (i: number) => {
    const src = sections[i]
    const copy = JSON.parse(JSON.stringify(src)) as Section
    copy.id = newId()
    copy.anchor = copy.anchor ? `${copy.anchor}-2` : undefined
    const next = sections.slice()
    next.splice(i + 1, 0, copy)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {sections.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 text-center">Nenhuma seção. Adicione a primeira abaixo.</p>
      )}
      {sections.map((s, i) => (
        <SectionCard key={s.id} section={s} index={i} total={sections.length} context={context}
          onChange={ns => onChange(sections.map((x, j) => (j === i ? ns : x)))}
          onMove={d => onChange(moveItem(sections, i, d))}
          onDuplicate={() => duplicate(i)}
          onRemove={() => onChange(removeAt(sections, i))} />
      ))}

      <div className="relative">
        <button type="button" onClick={() => setAddOpen(o => !o)} aria-expanded={addOpen} aria-haspopup="menu"
          className="inline-flex items-center gap-2 border border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#eff6ff] rounded-lg px-4 py-2 text-sm font-medium">
          <Plus className="w-4 h-4" /> Adicionar seção
        </button>
        {addOpen && (
          <div role="menu" className="absolute z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
            {(Object.keys(SECTION_LABEL) as SectionType[]).map(t => (
              <button key={t} type="button" role="menuitem" onClick={() => add(t)} className="block w-full text-left rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                {SECTION_LABEL[t]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
