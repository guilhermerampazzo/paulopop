'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { useCallback, useRef } from 'react'
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  Link as LinkIcon, ImageIcon,
  AlignLeft, AlignCenter, AlignRight,
  Undo, Redo,
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
}

function ToolbarButton({
  onClick,
  active,
  title,
  disabled,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`p-1.5 rounded-lg transition-colors ${
        active
          ? 'bg-[#1e3a8a] text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-[#1e3a8a]'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const uploadingRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-[#2563eb] hover:underline', target: '_blank', rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder: 'Escreva o conteúdo do post aqui...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'min-h-[400px] px-4 py-3 focus:outline-none prose prose-sm max-w-none',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  const handleImageUpload = useCallback(async (file: File) => {
    if (uploadingRef.current || !editor) return
    uploadingRef.current = true
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      const { url } = await res.json() as { url: string }
      editor.chain().focus().setImage({ src: url, alt: file.name }).run()
    } catch {
      alert('Falha no upload da imagem.')
    } finally {
      uploadingRef.current = false
    }
  }, [editor])

  const handleLinkAdd = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL do link:', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

  if (!editor) return null

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#2563eb]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-2 bg-gray-50 border-b border-gray-200">
        {/* Histórico */}
        <ToolbarButton title="Desfazer" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Refazer" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Títulos */}
        <ToolbarButton title="Título 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Título 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Título 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Formatação inline */}
        <ToolbarButton title="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Sublinhado" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Tachado" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Alinhamento */}
        <ToolbarButton title="Alinhar à esquerda" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Centralizar" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Alinhar à direita" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Listas */}
        <ToolbarButton title="Lista com marcadores" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Citação" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Divisor horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Link e imagem */}
        <ToolbarButton title="Inserir link" active={editor.isActive('link')} onClick={handleLinkAdd}>
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Inserir imagem"
          onClick={() => imageInputRef.current?.click()}
        >
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Área de edição */}
      <EditorContent editor={editor} />

      {/* Input oculto de imagem */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden="true"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleImageUpload(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
