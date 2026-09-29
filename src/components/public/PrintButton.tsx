'use client'

import { Printer } from 'lucide-react'

export function PrintButton({ label = 'Baixar PDF' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-[#ea580c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c2410c]">
      <Printer className="h-4 w-4" /> {label}
    </button>
  )
}
