'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/imoveis': 'Imóveis',
  '/admin/imoveis/novo': 'Novo Imóvel',
  '/admin/empreendimentos': 'Empreendimentos',
  '/admin/empreendimentos/novo': 'Novo Empreendimento',
  '/admin/contatos': 'Leads & Contatos',
  '/admin/analise-mercado': 'Estudos de mercado',
  '/admin/estudos': 'Estudos de mercado',
  '/admin/inteligencia': 'Inteligência',
  '/admin/estudos/': 'Estudo de mercado',
  '/admin/marketing': 'Marketing',
  '/admin/relatorios': 'Relatórios',
  '/admin/configuracoes': 'Configurações',
  '/admin/corretores': 'Corretores',
  '/admin/depoimentos': 'Depoimentos',
  '/admin/blog': 'Blog',
  '/admin/cidades': 'Cidades do DF',
  '/admin/cidades/': 'Editar cidade',
  '/admin/parceiros': 'Parceiros',
  '/admin/parceiros/': 'Editar parceiro',
  '/admin/alertas': 'Alertas de imóveis',
  '/admin/perfil': 'Meu perfil',
}

/** Telas só de administrador (SUPER_ADMIN e ADMIN). */
const ADMIN_ONLY = ['/admin/corretores', '/admin/configuracoes']

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (status === 'authenticated' && isLoginPage) {
      router.replace('/admin')
      return
    }

    if (status === 'unauthenticated' && !isLoginPage) {
      router.replace('/admin/login')
      return
    }

    // Corretor comum não entra nas telas de administrador
    const role = (session?.user as { role?: string } | undefined)?.role
    if (status === 'authenticated' && role === 'AGENT' && ADMIN_ONLY.some(p => pathname.startsWith(p))) {
      router.replace('/admin')
    }
  }, [status, router, isLoginPage, pathname, session])

  // Fechar menu mobile ao trocar de rota
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#2563eb] border-t-transparent" />
      </div>
    )
  }

  if (isLoginPage) return <>{children}</>

  if (status === 'unauthenticated') return null

  // Detecta o título da página pelo pathname (match mais longo primeiro)
  const pageTitle = Object.entries(pageTitles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => pathname.startsWith(key))?.[1] ?? 'Admin'

  const userName = session?.user?.name ?? 'Admin'
  const userRole = ((session?.user as { role?: string } | undefined)?.role ?? 'AGENT') as 'SUPER_ADMIN' | 'ADMIN' | 'AGENT'

  return (
    <div className="flex min-h-screen bg-[#F0F4F8]">
      <AdminSidebar
        userName={userName}
        userRole={userRole}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title={pageTitle}
          onMenuClick={() => setMobileMenuOpen(true)}
          userName={userName}
        />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
