'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Building2, Users,
  Megaphone, FileText, Settings, X, Landmark,
  UserCog, MessageSquareQuote, BookOpen, UserCircle, FileBarChart2, MapPinned, Handshake, BellRing
} from 'lucide-react'

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'AGENT'
const ROLE_LABEL: Record<Role, string> = { SUPER_ADMIN: 'Super administrador', ADMIN: 'Administrador', AGENT: 'Corretor' }

const navItems: Array<{ href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; adminOnly?: boolean }> = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/imoveis', label: 'Imóveis', icon: Building2 },
  { href: '/admin/empreendimentos', label: 'Empreendimentos', icon: Landmark },
  { href: '/admin/contatos', label: 'Leads & Contatos', icon: Users },
  { href: '/admin/alertas', label: 'Alertas de imóveis', icon: BellRing },
  { href: '/admin/corretores', label: 'Corretores', icon: UserCog, adminOnly: true },
  { href: '/admin/depoimentos', label: 'Depoimentos', icon: MessageSquareQuote },
  { href: '/admin/cidades', label: 'Cidades do DF', icon: MapPinned, adminOnly: true },
  { href: '/admin/parceiros', label: 'Parceiros', icon: Handshake, adminOnly: true },
  { href: '/admin/blog', label: 'Blog', icon: BookOpen },
  { href: '/admin/estudos', label: 'Estudos de mercado', icon: FileBarChart2 },
  { href: '/admin/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/admin/relatorios', label: 'Relatórios', icon: FileText },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings, adminOnly: true },
  { href: '/admin/perfil', label: 'Meu perfil', icon: UserCircle },
]

interface AdminSidebarProps {
  userName: string
  userRole?: Role
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function AdminSidebar({ userName, userRole = 'AGENT', mobileOpen, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN'
  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin)

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b border-[#1e40af]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Paulo Pop</h1>
          <p className="text-xs text-blue-300 mt-0.5">Painel Administrativo</p>
        </div>
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            aria-label="Fechar menu"
            className="lg:hidden p-1 rounded hover:bg-[#1e40af] text-blue-300 hover:text-white"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5" aria-label="Menu principal">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[#2563eb] text-white'
                  : 'text-blue-200 hover:bg-[#1e40af] hover:text-white'
              )}
            >
              <Icon size={18} aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-[#1e40af]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#2563eb] flex items-center justify-center text-white text-sm font-semibold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{userName}</p>
            <p className="text-xs text-blue-300">{ROLE_LABEL[userRole]}</p>
          </div>
        </div>
        <a
          href="/api/auth/signout"
          className="text-xs text-blue-400 hover:text-white transition-colors"
        >
          Sair do painel
        </a>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#1e3a8a] flex-col min-h-screen shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="relative z-50 w-64 bg-[#1e3a8a] flex flex-col min-h-screen">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
