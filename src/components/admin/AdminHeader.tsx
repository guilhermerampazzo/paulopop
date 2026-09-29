'use client'

import { Menu, Bell } from 'lucide-react'

interface AdminHeaderProps {
  title: string
  onMenuClick: () => void
  userName: string
}

export function AdminHeader({ title, onMenuClick, userName }: AdminHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-30">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        aria-label="Abrir menu"
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
      >
        <Menu size={20} />
      </button>

      <h1 className="text-lg font-semibold text-[#1e3a8a] flex-1">{title}</h1>

      <div className="flex items-center gap-2">
        <button aria-label="Notificações" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <Bell size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white text-sm font-semibold">
          {userName.charAt(0).toUpperCase()}
        </div>
        <span className="hidden md:block text-sm text-gray-700 font-medium">{userName}</span>
      </div>
    </header>
  )
}
