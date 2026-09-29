'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Building2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError(result.error.startsWith('Muitas tentativas') ? result.error : 'E-mail ou senha inválidos. Tente novamente.')
      setLoading(false)
    } else {
      router.replace('/admin')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)' }}
      >
        <div className="flex items-center gap-3">
          <Building2 className="text-white" size={32} />
          <span className="text-white text-2xl font-bold">Paulo Pop</span>
        </div>
        <div>
          <h2 className="text-white text-4xl font-bold mb-4">
            Bem-vindo ao<br />Painel Administrativo
          </h2>
          <p className="text-blue-200 text-lg">
            Gerencie seus imóveis, leads e análises de mercado em um só lugar.
          </p>
        </div>
        <p className="text-blue-300 text-sm">© 2025 Paulo Pop Imóveis. Todos os direitos reservados.</p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#F7F9FC]">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Building2 className="text-[#1e3a8a]" size={28} />
            <span className="text-[#1e3a8a] text-xl font-bold">Paulo Pop</span>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-[#1e3a8a] mb-1">Entrar</h1>
            <p className="text-gray-500 text-sm mb-6">Acesse o painel administrativo</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-label="E-mail"
                  placeholder="admin@paulopop.com.br"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent hover:border-gray-400 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    aria-label="Senha"
                    placeholder="••••••••"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent hover:border-gray-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                aria-label="Entrar no painel"
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Entrando...
                  </span>
                ) : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
