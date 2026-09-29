'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  side?: 'left' | 'right'
}

export function Drawer({ open, onClose, title, children, side = 'right' }: DrawerProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      )}
      <div
        className={cn(
          'fixed inset-y-0 z-50 w-80 bg-white shadow-2xl transition-transform duration-300 flex flex-col',
          side === 'right' ? 'right-0' : 'left-0',
          open
            ? 'translate-x-0'
            : side === 'right' ? 'translate-x-full' : '-translate-x-full'
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-semibold text-[#1e3a8a]">{title}</h2>
            <button onClick={onClose} aria-label="Fechar" className="p-1 rounded hover:bg-gray-100">
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  )
}
