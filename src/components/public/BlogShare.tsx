'use client'

/**
 * v1.3 — botões de compartilhar o post: WhatsApp, Facebook, X e copiar link.
 */
import { useState } from 'react'
import { Check, Link2, MessageCircle, Share2 } from 'lucide-react'

export function BlogShare({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)
  const text = encodeURIComponent(title)
  const u = encodeURIComponent(url)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copie o link:', url)
    }
  }

  const btn = 'inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-[#2563eb] hover:text-[#1e3a8a] transition-colors'

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Compartilhar">
      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[#ea580c] mr-1"><Share2 className="w-3.5 h-3.5" /> Compartilhar</span>
      <a href={`https://wa.me/?text=${text}%20${u}`} target="_blank" rel="noopener noreferrer" className={btn} aria-label="Compartilhar no WhatsApp">
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
      </a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${u}`} target="_blank" rel="noopener noreferrer" className={btn} aria-label="Compartilhar no Facebook">
        <span className="font-bold leading-none" aria-hidden="true">f</span> Facebook
      </a>
      <a href={`https://twitter.com/intent/tweet?text=${text}&url=${u}`} target="_blank" rel="noopener noreferrer" className={btn} aria-label="Compartilhar no X">
        <span className="font-bold leading-none" aria-hidden="true">X</span> X
      </a>
      <button type="button" onClick={copy} className={btn} aria-label="Copiar link do post">
        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Link2 className="w-3.5 h-3.5" />} {copied ? 'Copiado!' : 'Copiar link'}
      </button>
    </div>
  )
}
