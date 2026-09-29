'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const PREVIEW_CHARS = 500

export default function DescriptionExpander({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > PREVIEW_CHARS

  const displayed = !isLong || expanded ? text : text.slice(0, PREVIEW_CHARS) + '...'

  return (
    <div>
      <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{displayed}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-3 flex items-center gap-1 text-sm font-medium text-[#2563eb] hover:text-[#1e3a8a] transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>Ver menos <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>Veja mais da descrição › <ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      )}
    </div>
  )
}
