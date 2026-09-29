export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    await sendEmail({
      to: session.user?.email ?? '',
      subject: 'Teste de E-mail — Paulo Pop',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px">
          <h2 style="color:#1e3a8a">✅ Configuração de e-mail funcionando!</h2>
          <p>Este é um e-mail de teste enviado pelo painel do Paulo Pop.</p>
          <p style="color:#888;font-size:12px">Enviado em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      `,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[test-email]', error)
    return NextResponse.json({ error: 'Falha ao enviar e-mail' }, { status: 500 })
  }
}
