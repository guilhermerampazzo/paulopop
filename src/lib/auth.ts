import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { checkRateLimit } from './rateLimit'

// v1.1: sem segredo padrão. Em produção o servidor não sobe sem NEXTAUTH_SECRET.
const secret = process.env.NEXTAUTH_SECRET
if (!secret || secret.length < 16) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET não configurado (gere com: openssl rand -base64 32)')
  }
  console.warn('[auth] NEXTAUTH_SECRET ausente ou curto: usando valor só para desenvolvimento')
}

export const authOptions: NextAuthOptions = {
  secret: secret && secret.length >= 16 ? secret : 'local-dev-nextauth-secret',
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        // Limite de tentativas: 5 por IP e 5 por e-mail a cada 15 minutos
        const headers = (req as { headers?: Record<string, string | string[] | undefined> } | undefined)?.headers ?? {}
        const fwd = headers['x-forwarded-for']
        const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim() || (headers['x-real-ip'] as string | undefined) || 'unknown'
        const email = String(credentials.email).trim().toLowerCase()
        if (!checkRateLimit(`login:ip:${ip}`, 5, 15 * 60_000) || !checkRateLimit(`login:email:${email}`, 5, 15 * 60_000)) {
          throw new Error('Muitas tentativas. Aguarde 15 minutos e tente de novo.')
        }

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.active) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role: string }).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role: string; id: string }).role = token.role as string
        ;(session.user as { role: string; id: string }).id = token.id as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      const adminUrl = `${baseUrl}/admin`

      try {
        const target = new URL(url, baseUrl)

        if (target.origin !== baseUrl) return adminUrl
        if (target.pathname === '/admin/login') return adminUrl
        if (target.pathname.startsWith('/admin')) return target.toString()

        return adminUrl
      } catch {
        return adminUrl
      }
    },
  },
  pages: {
    signIn: '/admin/login',
  },
}
