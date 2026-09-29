'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, Link2, ClipboardPaste, CheckCircle2, AlertTriangle, ExternalLink, Pencil, Bookmark } from 'lucide-react'
import { REMAX_BOOKMARKLET } from '@/lib/remax/bookmarklet'

interface Result {
  id: string
  slug: string
  ref: string
  created: boolean
  status: string
  images: number
  imagesFailed: number
  sourceAgentName: string | null
  sourceOfficeName: string | null
  warnings: string[]
}

export function ImportarRemaxClient() {
  const [url, setUrl] = useState('')
  const [pasted, setPasted] = useState('')
  const [publish, setPublish] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const bookmarkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    // href definido aqui para o React não bloquear o link "javascript:"
    bookmarkRef.current?.setAttribute('href', REMAX_BOOKMARKLET)
  }, [blocked])

  async function send(body: Record<string, unknown>) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/admin/importar-remax', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, publish }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível importar.')
        if (data.blocked) setBlocked(true)
        return
      }
      setResult(data as Result)
      setUrl('')
      setPasted('')
    } catch {
      setError('Sem conexão com o servidor. Tente de novo.')
    } finally {
      setLoading(false)
    }
  }

  function importFromUrl(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    void send({ url: url.trim() })
  }

  function importFromPaste() {
    let payload: unknown
    try { payload = JSON.parse(pasted) } catch {
      setError('O texto colado não é válido. Use o botão "Copiar" da caixa que aparece na RE/MAX.')
      return
    }
    void send({ payload })
  }

  return (
    <div className="space-y-6">
      <form onSubmit={importFromUrl} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <label htmlFor="remax-url" className="block text-sm font-semibold text-[#1e3a8a]">Link do anúncio</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="remax-url"
              type="url"
              inputMode="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.remax.com.br/pt-br/imoveis/.../880221062-25"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1e3a8a] text-white text-sm font-medium rounded-lg hover:bg-[#172554] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {publish ? 'Importar e publicar' : 'Importar como rascunho'}
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} />
          Publicar no site assim que importar
        </label>
        {loading && (
          <p className="text-sm text-gray-500">Baixando fotos e dados… pode levar até 1 minuto em anúncios com muitas fotos.</p>
        )}
      </form>

      {error && (
        <div role="alert" className="flex gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="p-5 rounded-xl border border-green-200 bg-green-50 text-sm text-green-900 space-y-2">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            {result.created ? 'Imóvel importado' : 'Imóvel atualizado'} · Ref {result.ref} ·{' '}
            {result.status === 'ACTIVE' ? 'publicado no site' : 'salvo como rascunho'}
          </p>
          <p>{result.images} foto(s){result.imagesFailed ? `, ${result.imagesFailed} com erro` : ''}.</p>
          {result.sourceAgentName && (
            <p>Captação na RE/MAX: {result.sourceAgentName}{result.sourceOfficeName ? ` (${result.sourceOfficeName})` : ''}</p>
          )}
          {result.warnings.map(w => <p key={w} className="text-amber-800">⚠ {w}</p>)}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={`/admin/imoveis/${result.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-300 rounded-lg">
              <Pencil className="w-4 h-4" /> Revisar no painel
            </Link>
            {result.status === 'ACTIVE' && (
              <a href={`/imoveis/${result.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-300 rounded-lg">
                <ExternalLink className="w-4 h-4" /> Ver no site
              </a>
            )}
          </div>
        </div>
      )}

      <details open={blocked} className="bg-white rounded-xl border border-gray-200 p-5">
        <summary className="cursor-pointer text-sm font-semibold text-[#1e3a8a]">
          A RE/MAX bloqueou? Importe pelo botão de favoritos
        </summary>
        <ol className="mt-3 space-y-2 text-sm text-gray-600 list-decimal pl-5">
          <li>
            Arraste este botão para a barra de favoritos do navegador (uma vez só):{' '}
            <a
              ref={bookmarkRef}
              href="#"
              onClick={e => e.preventDefault()}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E11B22] text-white rounded-full text-xs font-semibold cursor-move"
            >
              <Bookmark className="w-3.5 h-3.5" /> Copiar para o Paulo Pop
            </a>
          </li>
          <li>Abra o anúncio em remax.com.br e clique no favorito. Na caixa que aparece, clique em <b>Copiar</b>.</li>
          <li>Volte aqui, cole abaixo e clique em Importar.</li>
        </ol>
        <textarea
          value={pasted}
          onChange={e => setPasted(e.target.value)}
          placeholder="Cole aqui o texto copiado da RE/MAX"
          rows={4}
          className="mt-4 w-full border border-gray-200 rounded-lg p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
          aria-label="Dados copiados da RE/MAX"
        />
        <button
          type="button"
          onClick={importFromPaste}
          disabled={loading || !pasted.trim()}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#2563eb] text-white text-sm font-medium rounded-lg disabled:opacity-50"
        >
          <ClipboardPaste className="w-4 h-4" /> Importar dados colados
        </button>
      </details>
    </div>
  )
}
