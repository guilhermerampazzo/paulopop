'use client'

import { useState, useRef } from 'react'
import { Trash2, Star, Upload, RotateCw } from 'lucide-react'
import NextImage from 'next/image'
import { Input } from '@/components/ui/Input'

interface PropertyImage {
  id?: string
  url: string
  thumbnailUrl?: string
  alt?: string
  isCover?: boolean
  is360?: boolean
  isPanoramic?: boolean
  order?: number
  _new?: boolean
}

interface PropertyVideo {
  youtubeUrl?: string
}

interface TabImagensVideosProps {
  propertyId: string
  images: PropertyImage[]
  videos: PropertyVideo[]
  virtualTourType: string
  virtualTourUrl: string
  externalLink: string
  onImagesChange: (images: PropertyImage[]) => void
  onVideosChange: (videos: PropertyVideo[]) => void
  onChange: (field: string, value: unknown) => void
}

export function TabImagensVideos({
  propertyId: _propertyId,
  images,
  videos,
  virtualTourType,
  virtualTourUrl,
  externalLink,
  onImagesChange,
  onVideosChange,
  onChange,
}: TabImagensVideosProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const youtubeUrl = videos[0]?.youtubeUrl ?? ''

  const uploadFile = async (file: File): Promise<PropertyImage | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'image')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error ?? 'Falha ao enviar arquivo')
        return null
      }
      return { url: data.url, thumbnailUrl: data.thumbnailUrl, isCover: images.length === 0, _new: true }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro de conexão')
      return null
    }
  }

  const handleFiles = async (files: FileList) => {
    setUploading(true)
    setUploadError(null)
    const newImages: PropertyImage[] = []
    for (const file of Array.from(files)) {
      const img = await uploadFile(file)
      if (img) newImages.push(img)
    }
    onImagesChange([...images, ...newImages])
    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }

  const setCover = (idx: number) => {
    onImagesChange(images.map((img, i) => ({ ...img, isCover: i === idx })))
  }

  const removeImage = (idx: number) => {
    onImagesChange(images.filter((_, i) => i !== idx))
  }

  const toggleFlag = (idx: number, flag: 'is360' | 'isPanoramic') => {
    onImagesChange(images.map((img, i) => i === idx ? { ...img, [flag]: !img[flag] } : img))
  }

  return (
    <div className="space-y-8 py-4">
      {/* Fotos */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#1e3a8a] uppercase tracking-wider">
            Fotos <span className="text-gray-400 font-normal">({images.length})</span>
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.dataset.mode = '360'
                  fileInputRef.current.click()
                }
              }}
              className="text-xs text-[#2563eb] border border-[#2563eb] px-3 py-1.5 rounded-lg hover:bg-[#2563eb] hover:text-white transition-colors"
            >
              + Foto 360°
            </button>
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.dataset.mode = 'panoramic'
                  fileInputRef.current.click()
                }
              }}
              className="text-xs text-[#2563eb] border border-[#2563eb] px-3 py-1.5 rounded-lg hover:bg-[#2563eb] hover:text-white transition-colors"
            >
              + Panorâmica
            </button>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-[#2563eb] bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Área de upload de imagens"
          onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
        >
          <Upload className="mx-auto text-gray-400 mb-2" size={32} aria-hidden="true" />
          <p className="text-sm text-gray-600">Arraste e solte as fotos aqui ou</p>
          <p className="text-sm font-medium text-[#2563eb] mt-1">clique para selecionar arquivos</p>
          <p className="text-xs text-gray-400 mt-2">JPEG, PNG, WEBP — máx. 10MB por arquivo</p>
          {uploading && <p className="text-sm text-[#2563eb] mt-2">Enviando...</p>}
          {uploadError && <p className="text-sm text-red-600 mt-2">Erro: {uploadError}</p>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          aria-label="Selecionar imagens"
          onChange={e => { if (e.target.files) handleFiles(e.target.files) }}
        />

        {/* Gallery */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
            {images.map((img, idx) => (
              <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-100">
                <NextImage
                  src={img.thumbnailUrl ?? img.url}
                  alt={img.alt ?? `Foto ${idx + 1}`}
                  fill
                  sizes="200px"
                  className="object-cover"
                  unoptimized
                />
                {img.isCover && (
                  <div className="absolute top-1 left-1 bg-[#2563eb] text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                    Capa
                  </div>
                )}
                {img.is360 && (
                  <div className="absolute top-1 right-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    360°
                  </div>
                )}
                {img.isPanoramic && (
                  <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    Pano
                  </div>
                )}
                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCover(idx)}
                    aria-label="Definir como capa"
                    title="Capa"
                    className="p-1.5 bg-white/90 rounded-lg hover:bg-white text-yellow-500"
                  >
                    <Star size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFlag(idx, 'is360')}
                    aria-label="Marcar como 360°"
                    title="360°"
                    className="p-1.5 bg-white/90 rounded-lg hover:bg-white text-purple-500"
                  >
                    <RotateCw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    aria-label="Excluir imagem"
                    title="Excluir"
                    className="p-1.5 bg-white/90 rounded-lg hover:bg-white text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Vídeo YouTube */}
      <section>
        <h3 className="text-sm font-semibold text-[#1e3a8a] uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">
          Vídeo
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">▶</span>
          </div>
          <Input
            id="youtubeUrl"
            value={youtubeUrl}
            onChange={e => onVideosChange([{ youtubeUrl: e.target.value }])}
            placeholder="https://youtube.com/watch?v=..."
            hint="Cole o link do YouTube (exceto Shorts)"
            className="flex-1"
          />
        </div>
      </section>

      {/* Tour Virtual */}
      <section>
        <h3 className="text-sm font-semibold text-[#1e3a8a] uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">
          Tour Virtual
        </h3>
        <div className="flex gap-4 mb-3">
          {['NONE', 'BANIB', 'OTHER'].map(v => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="virtualTourType"
                value={v}
                checked={virtualTourType === v}
                onChange={() => onChange('virtualTourType', v)}
                className="accent-[#2563eb]"
                aria-label={v === 'NONE' ? 'Nenhum' : v === 'BANIB' ? 'Banib' : 'Outro'}
              />
              <span className="text-sm text-gray-700">
                {v === 'NONE' ? 'Nenhum' : v === 'BANIB' ? 'Banib' : 'Outro'}
              </span>
            </label>
          ))}
        </div>
        {virtualTourType !== 'NONE' && (
          <Input
            id="virtualTourUrl"
            value={virtualTourUrl}
            onChange={e => onChange('virtualTourUrl', e.target.value)}
            placeholder="https://..."
            label="Link do Tour Virtual"
          />
        )}
      </section>

      {/* Link externo */}
      <section>
        <h3 className="text-sm font-semibold text-[#1e3a8a] uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">
          Link Para Outros Sites
        </h3>
        <Input
          id="externalLink"
          value={externalLink}
          onChange={e => onChange('externalLink', e.target.value)}
          placeholder="https://..."
          hint="Link externo adicional"
        />
      </section>
    </div>
  )
}
