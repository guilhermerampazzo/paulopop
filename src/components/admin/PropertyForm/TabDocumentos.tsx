'use client'

import { useState, useRef } from 'react'
import { FileText, Trash2, Download, Upload } from 'lucide-react'

interface PropertyDocument {
  id?: string
  name: string
  url: string
  type?: string
  size?: number
  isPublic: boolean
  createdAt?: string
}

interface TabDocumentosProps {
  documents: PropertyDocument[]
  onDocumentsChange: (docs: PropertyDocument[]) => void
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocumentSection({
  title,
  docs,
  isPublic,
  onUpload,
  onRemove,
  uploading,
}: {
  title: string
  docs: PropertyDocument[]
  isPublic: boolean
  onUpload: (file: File, isPublic: boolean) => void
  onRemove: (idx: number, isPublic: boolean) => void
  uploading: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    <section>
      <h3 className="text-sm font-semibold text-[#1e3a8a] uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">
        {title}
      </h3>
      <div className="space-y-2 mb-3">
        {docs.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Nenhum documento adicionado.</p>
        ) : (
          docs.map((doc, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <FileText className="text-gray-400 shrink-0" size={20} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{doc.name}</p>
                <p className="text-xs text-gray-400">{doc.type?.toUpperCase()} • {formatBytes(doc.size)}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <a
                  href={doc.url}
                  download
                  aria-label={`Baixar ${doc.name}`}
                  className="p-1.5 text-gray-400 hover:text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Download size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => onRemove(i, isPublic)}
                  aria-label={`Remover ${doc.name}`}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 text-sm text-[#2563eb] border border-[#2563eb] px-4 py-2 rounded-lg hover:bg-[#2563eb] hover:text-white transition-colors disabled:opacity-60"
      >
        <Upload size={16} />
        {uploading ? 'Enviando...' : 'Carregar documentos (máx 10MB)'}
      </button>
      <input
        ref={ref}
        type="file"
        accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
        className="hidden"
        aria-label="Selecionar documento"
        onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0], isPublic) }}
      />
    </section>
  )
}

export function TabDocumentos({ documents, onDocumentsChange }: TabDocumentosProps) {
  const [uploading, setUploading] = useState(false)
  const privateDocs = documents.filter(d => !d.isPublic)
  const publicDocs = documents.filter(d => d.isPublic)

  const handleUpload = async (file: File, isPublic: boolean) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'document')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onDocumentsChange([
        ...documents,
        {
          name: file.name,
          url: data.url,
          type: file.name.split('.').pop(),
          size: data.size,
          isPublic,
        },
      ])
    } catch {
      alert('Erro ao enviar documento.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = (idx: number, isPublic: boolean) => {
    const target = isPublic ? publicDocs : privateDocs
    const doc = target[idx]
    onDocumentsChange(documents.filter(d => d !== doc))
  }

  return (
    <div className="space-y-8 py-4">
      <DocumentSection
        title="Documentos Privados"
        docs={privateDocs}
        isPublic={false}
        onUpload={handleUpload}
        onRemove={handleRemove}
        uploading={uploading}
      />
      <DocumentSection
        title="Documentos Públicos (visíveis no site)"
        docs={publicDocs}
        isPublic={true}
        onUpload={handleUpload}
        onRemove={handleRemove}
        uploading={uploading}
      />
    </div>
  )
}
