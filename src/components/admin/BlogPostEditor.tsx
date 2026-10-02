'use client'

/**
 * v1.3 — Editor de post do blog com abas:
 * Conteúdo (título, resumo, capa, categoria, tags, série, cidade, destaque, corpo + blocos extras),
 * Publicação (status, data/hora em Brasília, rótulo Rascunho / Agendado / Publicado, pré-visualização),
 * SEO (título, descrição com contador, og:image, prévia do Google) e Escrever com IA (Gemini).
 */
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Save, Globe, FileText, Upload, X, Loader2, Tag, Clock, Eye, Sparkles, Star,
  CheckCircle, AlertCircle, Image as ImageIcon, ArrowLeft, Link2,
} from 'lucide-react'
import { SectionEditor } from './SectionEditor'
import { ImageUpload, inputCls } from './sections/shared'
import type { Section } from '@/lib/sections'
import { BLOG_CATEGORIES, VISIBILITY_LABEL, hasH1, postVisibility, parseBrasiliaDateTime, toBrasiliaInput, formatBlogDateTime, type BlogVisibility } from '@/lib/blog'
import { slugify } from '@/lib/utils'

const RichTextEditor = dynamic(
  () => import('./RichTextEditor').then(m => m.RichTextEditor),
  { ssr: false, loading: () => <div className="h-64 border border-gray-300 rounded-xl bg-gray-50 animate-pulse" /> }
)

export interface BlogEditorInitial {
  id?: string
  slug?: string
  title: string
  excerpt: string
  content: string
  coverUrl: string
  category: string
  tags: string[]
  series: string
  citySlug: string
  featured: boolean
  sections: Section[]
  status: 'DRAFT' | 'PUBLISHED'
  /** "YYYY-MM-DDTHH:mm" no horário de Brasília */
  publishedAt: string
  seoTitle: string
  seoDescription: string
  ogImageUrl: string
  readingMinutes?: number | null
}

const EMPTY: BlogEditorInitial = {
  title: '', excerpt: '', content: '', coverUrl: '', category: '', tags: [], series: '', citySlug: '', featured: false,
  sections: [], status: 'DRAFT', publishedAt: '', seoTitle: '', seoDescription: '', ogImageUrl: '', readingMinutes: null,
}

type Tab = 'conteudo' | 'publicacao' | 'seo' | 'ia'
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'conteudo', label: 'Conteúdo' },
  { id: 'publicacao', label: 'Publicação' },
  { id: 'seo', label: 'SEO' },
  { id: 'ia', label: 'Escrever com IA' },
]

const BADGE: Record<BlogVisibility, string> = {
  draft: 'text-amber-600',
  scheduled: 'text-blue-600',
  published: 'text-green-600',
}

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'https://corretorpaulopop.com'

/** Mostra o rótulo do status considerando a data (agendado = publicado no futuro). */
function statusFromForm(form: BlogEditorInitial): BlogVisibility {
  const at = form.publishedAt ? parseBrasiliaDateTime(form.publishedAt) : null
  return postVisibility({ status: form.status, publishedAt: at })
}

interface Props {
  initial?: Partial<BlogEditorInitial> & { id?: string }
  cities: Array<{ slug: string; name: string }>
}

export function BlogPostEditor({ initial, cities }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<BlogEditorInitial>({ ...EMPTY, ...initial })
  const [tab, setTab] = useState<Tab>('conteudo')
  const [slugEdited, setSlugEdited] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warn'; msg: string } | null>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  // IA
  const [aiTopic, setAiTopic] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiMsg, setAiMsg] = useState('')

  const isEdit = !!initial?.id
  const visibility = statusFromForm(form)
  const isCustomCategory = !!form.category && !(BLOG_CATEGORIES as readonly string[]).includes(form.category)
  const [customCategory, setCustomCategory] = useState(isCustomCategory)
  const cityName = cities.find(c => c.slug === form.citySlug)?.name

  function set<K extends keyof BlogEditorInitial>(field: K, value: BlogEditorInitial[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Slug sugerido: enquanto rascunho e sem edição manual, segue o título
  const suggestedSlug = useMemo(() => slugify(form.title || ''), [form.title])
  const shownSlug = slugEdited
    ? (form.slug ?? '')
    : isEdit && (initial?.status === 'PUBLISHED' || form.title === initial?.title)
      ? (form.slug ?? '')
      : suggestedSlug

  async function uploadCover(file: File) {
    setUploadingCover(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      const { url } = await res.json() as { url: string }
      set('coverUrl', url)
    } catch {
      setFeedback({ type: 'error', msg: 'Falha no upload da imagem de capa.' })
    } finally {
      setUploadingCover(false)
      if (coverRef.current) coverRef.current.value = ''
    }
  }

  function addTag(raw?: string) {
    const parts = (raw ?? tagInput).split(/[,;]/).map(t => t.trim()).filter(Boolean)
    if (parts.length) set('tags', Array.from(new Set([...form.tags, ...parts])))
    setTagInput('')
  }

  function removeTag(tag: string) {
    set('tags', form.tags.filter(t => t !== tag))
  }

  async function handleSave(statusOverride?: 'DRAFT' | 'PUBLISHED') {
    setSaving(true)
    setFeedback(null)
    const status = statusOverride ?? form.status
    const payload = {
      ...form,
      status,
      slug: slugEdited ? form.slug : undefined,
      slugAuto: !slugEdited,
      publishedAt: form.publishedAt || null,
    }
    try {
      const url = isEdit ? `/api/admin/blog/${initial!.id}` : '/api/admin/blog'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const saved = await res.json().catch(() => ({})) as { id?: string; slug?: string; publishedAt?: string | null; readingMinutes?: number | null; error?: string }
      if (!res.ok) throw new Error(saved.error ?? 'Erro ao salvar')
      setForm(prev => ({
        ...prev,
        status,
        slug: saved.slug ?? prev.slug,
        publishedAt: saved.publishedAt ? toBrasiliaInput(saved.publishedAt) : prev.publishedAt,
        readingMinutes: saved.readingMinutes ?? prev.readingMinutes,
      }))
      setSlugEdited(false)
      const v = postVisibility({ status, publishedAt: saved.publishedAt ?? null })
      setFeedback({
        type: 'success',
        msg: v === 'published' ? 'Post publicado com sucesso!' : v === 'scheduled' ? `Post agendado para ${formatBlogDateTime(saved.publishedAt)}.` : 'Rascunho salvo!',
      })
      if (!isEdit && saved.id) {
        setTimeout(() => router.push(`/admin/blog/${saved.id}`), 600)
      }
    } catch (e) {
      setFeedback({ type: 'error', msg: e instanceof Error ? e.message : 'Erro ao salvar' })
    } finally {
      setSaving(false)
    }
  }

  async function generateWithAi() {
    if (!aiTopic.trim()) { setAiMsg('Informe o tema do post.'); return }
    setAiBusy(true); setAiMsg('')
    try {
      const res = await fetch('/api/admin/blog/ia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, category: form.category || undefined, city: cityName || undefined }),
      })
      const data = await res.json().catch(() => ({})) as { title?: string; excerpt?: string; contentHtml?: string; tags?: string[]; seoTitle?: string; seoDescription?: string; warning?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? (res.status === 503 ? 'IA indisponível: configure a chave do Gemini.' : 'Falha ao gerar'))
      // Preenche só o que está vazio, para não apagar o trabalho já feito
      setForm(prev => ({
        ...prev,
        title: prev.title || data.title || prev.title,
        excerpt: prev.excerpt || data.excerpt || prev.excerpt,
        content: prev.content.replace(/<[^>]+>/g, '').trim() ? prev.content : (data.contentHtml || prev.content),
        tags: prev.tags.length ? prev.tags : (data.tags ?? []),
        seoTitle: prev.seoTitle || data.seoTitle || prev.seoTitle,
        seoDescription: prev.seoDescription || data.seoDescription || prev.seoDescription,
      }))
      setAiMsg(data.warning ?? 'Rascunho gerado por IA: revise antes de publicar.')
      setTab('conteudo')
      setFeedback({ type: 'warn', msg: data.warning ?? 'Rascunho gerado por IA: revise o texto antes de publicar.' })
    } catch (e) {
      setAiMsg(e instanceof Error ? e.message : 'Falha ao gerar com IA')
    } finally {
      setAiBusy(false)
    }
  }

  const previewHref = form.slug ? `/blog/${form.slug}${visibility === 'published' ? '' : '?preview=1'}` : null
  const seoTitlePreview = (form.seoTitle || form.title || 'Título do post') + ' | Paulo Pop'
  const seoDescPreview = form.seoDescription || form.excerpt || 'A descrição aparece aqui. Escreva um resumo de até 155 caracteres.'

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 min-w-0">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href="/admin/blog"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#1e3a8a] transition-colors flex-shrink-0"
            aria-label="Voltar para lista de posts"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[#1e3a8a] truncate">{isEdit ? 'Editar post' : 'Novo post'}</h1>
            <p className={`text-sm inline-flex items-center gap-1 ${BADGE[visibility]}`}>
              {visibility === 'published' ? <Globe className="w-3 h-3" /> : visibility === 'scheduled' ? <Clock className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
              {VISIBILITY_LABEL[visibility]}
              {visibility === 'scheduled' && form.publishedAt && <span className="text-gray-500"> · vai ao ar em {formatBlogDateTime(parseBrasiliaDateTime(form.publishedAt))}</span>}
              {form.readingMinutes ? <span className="text-gray-400"> · {form.readingMinutes} min de leitura</span> : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isEdit && previewHref && (
            <a
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#eff6ff] rounded-lg px-4 py-2 text-sm font-medium"
              aria-label={visibility === 'published' ? 'Ver post no site' : 'Pré-visualizar post'}
            >
              <Eye className="w-4 h-4" /> {visibility === 'published' ? 'Ver no site' : 'Pré-visualizar'}
            </a>
          )}
          <button
            onClick={() => handleSave('DRAFT')}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60 transition-colors"
            aria-label="Salvar como rascunho"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Rascunho
          </button>
          <button
            onClick={() => handleSave('PUBLISHED')}
            disabled={saving || !form.title || !form.content}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
            aria-label="Publicar post"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {form.publishedAt && parseBrasiliaDateTime(form.publishedAt) && parseBrasiliaDateTime(form.publishedAt)!.getTime() > Date.now() ? 'Agendar' : 'Publicar'}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          role="alert"
          aria-live="polite"
          className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm ${
            feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200'
              : feedback.type === 'warn' ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {feedback.msg}
          <button onClick={() => setFeedback(null)} className="ml-auto" aria-label="Fechar alerta">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-6" role="tablist">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px inline-flex items-center gap-1.5 ${tab === t.id ? 'border-[#ea580c] text-[#1e3a8a]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.id === 'ia' && <Sparkles className="w-3.5 h-3.5" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Conteúdo ── */}
      {tab === 'conteudo' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px] min-w-0">
          <div className="space-y-5 min-w-0">
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm">
              <label htmlFor="blog-title" className="block text-sm font-medium text-gray-700 mb-2">Título do post *</label>
              <input
                id="blog-title"
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Digite o título do post..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                aria-required="true"
              />
              <div className="mt-3">
                <label htmlFor="blog-slug" className="block text-xs font-medium text-gray-700 mb-1">Endereço (slug)</label>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-gray-400 whitespace-nowrap">/blog/</span>
                  <input
                    id="blog-slug"
                    type="text"
                    value={shownSlug}
                    onChange={e => { setSlugEdited(true); set('slug', slugify(e.target.value)) }}
                    className={inputCls}
                    placeholder="gerado a partir do título"
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  {isEdit && initial?.status === 'PUBLISHED'
                    ? 'Post já publicado: o endereço só muda se você editar este campo.'
                    : 'Gerado automaticamente a partir do título enquanto for rascunho.'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm">
              <label htmlFor="blog-excerpt" className="block text-sm font-medium text-gray-700 mb-2">
                Resumo <span className="ml-1 text-xs text-gray-400">(cards, capa do blog e descrição padrão)</span>
              </label>
              <textarea
                id="blog-excerpt"
                value={form.excerpt}
                onChange={e => set('excerpt', e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Resumo do post (até 500 caracteres)..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">{form.excerpt.length}/500</p>
            </div>

            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm min-w-0">
              <span className="block text-sm font-medium text-gray-700 mb-2">Conteúdo *</span>
              <RichTextEditor value={form.content} onChange={html => set('content', html)} />
              <p className="mt-2 text-[11px] text-gray-500">Use títulos (H2/H3) para montar o índice lateral do post automaticamente.</p>
              {hasH1(form.content) && (
                <p role="status" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  O texto tem um título H1. O título do post já é o H1 da página; no site esse título do texto será mostrado como H2. Para ficar igual ao que você vê aqui, troque-o por H2.
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm min-w-0">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Blocos extras</h3>
              <p className="text-xs text-gray-500 mb-4">Galeria, vídeo, imóveis, empreendimentos, CTA, perguntas frequentes… aparecem depois do texto.</p>
              <SectionEditor
                value={form.sections}
                onChange={s => set('sections', s)}
                context={{ pageName: form.title, pageKind: 'Post do blog', cityNames: cityName ? [cityName] : undefined }}
              />
            </div>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-5 min-w-0">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Imagem de capa</h3>
              {form.coverUrl ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.coverUrl} alt="Capa do post" className="w-full aspect-[16/9] object-cover rounded-xl" />
                  <button
                    onClick={() => set('coverUrl', '')}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                    aria-label="Remover imagem de capa"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverRef.current?.click()}
                  disabled={uploadingCover}
                  className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#2563eb] hover:text-[#2563eb] transition-colors disabled:opacity-60"
                  aria-label="Selecionar imagem de capa"
                >
                  {uploadingCover ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  <span className="text-xs">{uploadingCover ? 'Enviando...' : 'Clique para selecionar (16:9)'}</span>
                </button>
              )}
              <input
                ref={coverRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f) }}
              />
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <label htmlFor="blog-category" className="block text-sm font-semibold text-gray-700 mb-2">Categoria</label>
                <select
                  id="blog-category"
                  value={customCategory ? '__custom' : form.category}
                  onChange={e => {
                    if (e.target.value === '__custom') { setCustomCategory(true); set('category', '') }
                    else { setCustomCategory(false); set('category', e.target.value) }
                  }}
                  className={inputCls}
                >
                  <option value="">Sem categoria</option>
                  {BLOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__custom">Outra…</option>
                </select>
                {customCategory && (
                  <input
                    type="text"
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    placeholder="Nome da categoria"
                    aria-label="Categoria personalizada"
                    className={`${inputCls} mt-2`}
                  />
                )}
              </div>

              <div>
                <label htmlFor="blog-tag-input" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Tag className="w-4 h-4" /> Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    id="blog-tag-input"
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
                    placeholder="Tag e Enter"
                    className={inputCls}
                  />
                  <button type="button" onClick={() => addTag()} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors" aria-label="Adicionar tag">+</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#eff6ff] text-[#1e3a8a] text-xs rounded-full">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} aria-label={`Remover tag ${tag}`}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  {form.tags.length === 0 && <p className="text-xs text-gray-400">Nenhuma tag. Dica: use o nome de uma cidade como tag para mostrar imóveis da região.</p>}
                </div>
              </div>

              <div>
                <label htmlFor="blog-series" className="block text-sm font-semibold text-gray-700 mb-2">Série</label>
                <input
                  id="blog-series"
                  type="text"
                  list="blog-series-list"
                  value={form.series}
                  onChange={e => set('series', e.target.value)}
                  placeholder="ex.: Guia do comprador"
                  className={inputCls}
                />
                <datalist id="blog-series-list">
                  <option value="Guia do comprador" />
                  <option value="Guia do proprietário" />
                </datalist>
                <p className="mt-1 text-[11px] text-gray-500">Posts da mesma série aparecem em ordem de publicação, com link "Próximo da série".</p>
              </div>

              <div>
                <label htmlFor="blog-city" className="block text-sm font-semibold text-gray-700 mb-2">Cidade ligada</label>
                <select id="blog-city" value={form.citySlug} onChange={e => set('citySlug', e.target.value)} className={inputCls}>
                  <option value="">Nenhuma</option>
                  {cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-gray-500">Mostra "Imóveis nesta região" no post e liga o post à página da cidade.</p>
              </div>

              <label htmlFor="blog-featured" className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input id="blog-featured" type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} className="rounded border-gray-300 text-[#1e3a8a] focus:ring-[#2563eb]" />
                <Star className="w-4 h-4 text-[#ea580c]" /> Destaque na capa do blog
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── Publicação ── */}
      {tab === 'publicacao' && (
        <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Status</h3>
            <div className="space-y-2">
              {[
                { value: 'DRAFT', label: 'Rascunho', desc: 'Visível apenas no painel (e na pré-visualização logado).' },
                { value: 'PUBLISHED', label: 'Publicado', desc: 'No site a partir da data e hora abaixo.' },
              ].map(opt => (
                <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="post-status"
                    value={opt.value}
                    checked={form.status === opt.value}
                    onChange={() => set('status', opt.value as 'DRAFT' | 'PUBLISHED')}
                    className="mt-0.5 accent-[#2563eb]"
                    aria-label={opt.label}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label htmlFor="blog-published-at" className="block text-sm font-semibold text-gray-700 mb-2">Data e hora de publicação (Brasília)</label>
              <input
                id="blog-published-at"
                type="datetime-local"
                value={form.publishedAt}
                onChange={e => set('publishedAt', e.target.value)}
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Vazio = agora, ao publicar. Uma data no futuro deixa o post <strong>agendado</strong>: ele só aparece no site (e no RSS) a partir dessa hora.
              </p>
              {form.publishedAt && (
                <button type="button" onClick={() => set('publishedAt', '')} className="mt-2 text-xs text-[#2563eb] hover:underline">Limpar data</button>
              )}
            </div>

            <div className={`rounded-xl px-4 py-3 text-sm inline-flex items-center gap-2 ${visibility === 'published' ? 'bg-green-50 text-green-700' : visibility === 'scheduled' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
              {visibility === 'published' ? <Globe className="w-4 h-4" /> : visibility === 'scheduled' ? <Clock className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              <span>
                <strong>{VISIBILITY_LABEL[visibility]}</strong>
                {visibility === 'scheduled' && form.publishedAt ? ` · vai ao ar em ${formatBlogDateTime(parseBrasiliaDateTime(form.publishedAt))}` : ''}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Pré-visualização</h3>
            {isEdit && previewHref ? (
              <>
                <p className="text-sm text-gray-600">
                  {visibility === 'published'
                    ? 'O post está no ar. Salve as alterações antes de abrir.'
                    : 'Rascunhos e agendados abrem com ?preview=1, apenas para quem está logado no painel. Salve antes de abrir.'}
                </p>
                <a href={previewHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white rounded-lg px-4 py-2 text-sm font-medium">
                  <Eye className="w-4 h-4" /> {visibility === 'published' ? 'Ver no site' : 'Pré-visualizar'}
                </a>
                <p className="text-xs text-gray-400 inline-flex items-center gap-1 break-all"><Link2 className="w-3 h-3" /> {SITE_ORIGIN}{previewHref}</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Salve o post (como rascunho) para liberar a pré-visualização.</p>
            )}
          </div>
        </div>
      )}

      {/* ── SEO ── */}
      {tab === 'seo' && (
        <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <div>
              <label htmlFor="blog-seo-title" className="block text-sm font-semibold text-gray-700 mb-1">Título para o Google</label>
              <input id="blog-seo-title" type="text" value={form.seoTitle} onChange={e => set('seoTitle', e.target.value)} placeholder={form.title || 'Se vazio, usa o título do post'} maxLength={120} className={inputCls} />
              <p className={`mt-1 text-[11px] ${form.seoTitle.length > 60 ? 'text-amber-600' : 'text-gray-500'}`}>{form.seoTitle.length}/60 caracteres recomendados</p>
            </div>
            <div>
              <label htmlFor="blog-seo-desc" className="block text-sm font-semibold text-gray-700 mb-1">Descrição para o Google</label>
              <textarea id="blog-seo-desc" value={form.seoDescription} onChange={e => set('seoDescription', e.target.value)} rows={3} maxLength={300} placeholder={form.excerpt || 'Se vazio, usa o resumo'} className={inputCls} />
              <p className={`mt-1 text-[11px] ${form.seoDescription.length > 155 ? 'text-amber-600' : 'text-gray-500'}`}>{form.seoDescription.length}/155 caracteres recomendados</p>
            </div>
            <ImageUpload label="Imagem de compartilhamento (og:image) — se vazia, usa a capa" value={form.ogImageUrl || undefined} onChange={u => set('ogImageUrl', u ?? '')} />
          </div>

          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Como fica no Google</h3>
            <div className="rounded-xl border border-gray-200 p-4 bg-white max-w-[600px] min-w-0">
              <p className="text-xs text-gray-600 truncate">{SITE_ORIGIN.replace(/^https?:\/\//, '')} › blog › {shownSlug || 'titulo-do-post'}</p>
              <p className="mt-1 text-[#1a0dab] text-lg leading-snug break-words line-clamp-1">{seoTitlePreview}</p>
              <p className="mt-1 text-sm text-gray-700 break-words line-clamp-2">{seoDescPreview}</p>
            </div>
            {(form.ogImageUrl || form.coverUrl) && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Imagem ao compartilhar (WhatsApp/Facebook):</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.ogImageUrl || form.coverUrl} alt="" className="w-full max-w-[360px] aspect-[1.91/1] object-cover rounded-lg border border-gray-200" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Escrever com IA ── */}
      {tab === 'ia' && (
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm max-w-3xl space-y-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#ea580c] mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Escrever com IA (Gemini)</h3>
              <p className="text-xs text-gray-500">Gera título, resumo, texto, tags e SEO em português a partir de um tema. Preenche apenas os campos que ainda estão vazios.</p>
            </div>
          </div>
          <div>
            <label htmlFor="blog-ai-topic" className="block text-sm font-medium text-gray-700 mb-1">Tema do post</label>
            <textarea
              id="blog-ai-topic"
              value={aiTopic}
              onChange={e => setAiTopic(e.target.value)}
              rows={3}
              placeholder="ex.: O que verificar antes de comprar um apartamento na planta em Águas Claras"
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Contexto enviado: categoria {form.category ? `"${form.category}"` : 'não definida'}{cityName ? ` · cidade ${cityName}` : ''}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void generateWithAi()}
            disabled={aiBusy || !aiTopic.trim()}
            className="inline-flex items-center gap-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Gerar rascunho
          </button>
          {aiMsg && (
            <p className={`rounded-lg px-3 py-2 text-sm ${/indispon|Falha|Informe/i.test(aiMsg) ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{aiMsg}</p>
          )}
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            Sempre revise o que a IA escreve: confira números, prazos e leis, e ajuste o tom antes de publicar.
          </p>
        </div>
      )}
    </div>
  )
}
