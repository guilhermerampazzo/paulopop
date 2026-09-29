'use client'

import { MessageCircle } from 'lucide-react'

interface WhatsAppButtonProps {
  phone: string
  message?: string
}

export function WhatsAppButton({ phone, message = 'Olá! Tenho interesse em um imóvel.' }: WhatsAppButtonProps) {
  // Remover caracteres não numéricos do telefone
  const cleanPhone = phone.replace(/\D/g, '')
  const encodedMessage = encodeURIComponent(message)
  const href = `https://wa.me/${cleanPhone}?text=${encodedMessage}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar pelo WhatsApp"
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 print:hidden flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#1ebe57] hover:scale-110 transition-all duration-200"
    >
      <MessageCircle className="w-7 h-7" fill="white" strokeWidth={0} />
    </a>
  )
}
