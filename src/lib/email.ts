import nodemailer from 'nodemailer'
import { escapeHtml as e } from '@/lib/sanitize'

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

/** Envia e-mail de notificação ao corretor quando um novo lead é recebido */
export async function sendLeadNotificationToAgent(lead: {
  name: string
  email?: string | null
  phone: string
  message?: string | null
  propertyTitle?: string | null
  propertyRef?: string | null
  // v1.1: e-mail do corretor do imóvel (o admin vai em cópia) e link direto do anúncio
  agentEmail?: string | null
  agentName?: string | null
  propertyUrl?: string | null
}) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL
  const to = lead.agentEmail || notificationEmail
  if (!to || !process.env.SMTP_HOST) return
  const cc = lead.agentEmail && notificationEmail && notificationEmail !== lead.agentEmail ? notificationEmail : undefined

  const from = process.env.EMAIL_FROM ?? 'noreply@paulopop.com.br'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#F0F4F8;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:32px 16px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;">
              <!-- Header -->
              <tr>
                <td style="background:#1e3a8a;padding:24px 32px;">
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;">Paulo Pop</h1>
                  <p style="margin:4px 0 0;color:#93C5FD;font-size:13px;">Novo Lead Recebido</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding:32px;">
                  <h2 style="color:#1e3a8a;margin:0 0 8px;font-size:18px;">Novo contato recebido</h2>
                  <p style="color:#64748B;margin:0 0 24px;font-size:14px;">Um novo lead entrou em contato pelo site.</p>

                  <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:8px;margin-bottom:24px;">
                    <tr style="background:#F0F4F8;">
                      <td style="color:#1e3a8a;font-weight:bold;font-size:13px;width:40%;">Nome</td>
                      <td style="color:#1E293B;font-size:13px;">${e(lead.name)}</td>
                    </tr>
                    <tr>
                      <td style="color:#1e3a8a;font-weight:bold;font-size:13px;">Telefone</td>
                      <td style="color:#1E293B;font-size:13px;">${e(lead.phone)}</td>
                    </tr>
                    ${lead.email ? `
                    <tr style="background:#F0F4F8;">
                      <td style="color:#1e3a8a;font-weight:bold;font-size:13px;">E-mail</td>
                      <td style="color:#1E293B;font-size:13px;">${e(lead.email)}</td>
                    </tr>` : ''}
                    ${lead.propertyTitle || lead.propertyRef ? `
                    <tr ${lead.email ? '' : 'style="background:#F0F4F8;"'}>
                      <td style="color:#1e3a8a;font-weight:bold;font-size:13px;">Imóvel</td>
                      <td style="color:#1E293B;font-size:13px;">${e(lead.propertyTitle ?? '')} ${lead.propertyRef ? `(Ref: ${e(lead.propertyRef)})` : ''}${lead.propertyUrl ? `<br><a href="${e(lead.propertyUrl)}" style="color:#2563eb;">${e(lead.propertyUrl)}</a>` : ''}</td>
                    </tr>` : ''}
                    ${lead.message ? `
                    <tr style="background:#F0F4F8;">
                      <td style="color:#1e3a8a;font-weight:bold;font-size:13px;vertical-align:top;">Mensagem</td>
                      <td style="color:#1E293B;font-size:13px;">${e(lead.message)}</td>
                    </tr>` : ''}
                  </table>

                  <a href="${siteUrl}/admin/contatos" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;">
                    Ver no Painel Admin
                  </a>
                  <a href="https://wa.me/${e(String(lead.phone).replace(/\D/g, '').replace(/^(?!55)(\d{10,11})$/, '55$1'))}?text=${encodeURIComponent(`Olá ${lead.name.split(' ')[0]}, aqui é ${lead.agentName ?? 'Paulo Pop'}. Recebi seu contato pelo site${lead.propertyRef ? ` sobre o imóvel ${lead.propertyRef}` : ''}. Podemos conversar?`)}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;margin-left:8px;">
                    Responder no WhatsApp
                  </a>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#F0F4F8;padding:16px 32px;border-top:1px solid #E2E8F0;">
                  <p style="margin:0;color:#94A3B8;font-size:12px;">Paulo Pop — Portal Imobiliário</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from,
      to,
      cc,
      subject: `Novo lead: ${lead.name}${lead.propertyRef ? ` — imóvel ${lead.propertyRef}` : ''} — Paulo Pop`,
      html,
    })
  } catch (err) {
    // Log mas não bloqueia o fluxo principal
    console.error('[Email] Falha ao enviar notificação ao corretor:', err)
  }
}

/** Envia e-mail de confirmação ao lead após envio do formulário */
export async function sendLeadConfirmationToContact(lead: {
  name: string
  email: string
  propertyTitle?: string | null
}) {
  if (!process.env.SMTP_HOST) return

  const from = process.env.EMAIL_FROM ?? 'noreply@paulopop.com.br'
  const ownerName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Paulo Pop'

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#F0F4F8;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:32px 16px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;">
              <tr>
                <td style="background:#1e3a8a;padding:24px 32px;">
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;">${e(ownerName)}</h1>
                  <p style="margin:4px 0 0;color:#93C5FD;font-size:13px;">Mensagem recebida com sucesso</p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <h2 style="color:#1e3a8a;margin:0 0 16px;font-size:18px;">Olá, ${e(lead.name)}!</h2>
                  <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 16px;">
                    Recebemos sua mensagem${lead.propertyTitle ? ` sobre o imóvel <strong style="color:#1e3a8a;">${e(lead.propertyTitle)}</strong>` : ''} e entraremos em contato em breve.
                  </p>
                  <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 24px;">
                    Fique à vontade para entrar em contato diretamente pelo WhatsApp caso prefira uma resposta mais rápida.
                  </p>
                  <p style="color:#94A3B8;font-size:13px;margin:0;">
                    Atenciosamente,<br>
                    <strong style="color:#1e3a8a;">${e(ownerName)}</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#F0F4F8;padding:16px 32px;border-top:1px solid #E2E8F0;">
                  <p style="margin:0;color:#94A3B8;font-size:12px;">Paulo Pop — Portal Imobiliário</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from,
      to: lead.email,
      subject: `Recebemos sua mensagem — ${e(ownerName)}`,
      html,
    })
  } catch (err) {
    console.error('[Email] Falha ao enviar confirmação ao lead:', err)
  }
}

/** Envia relatório de análise de mercado ao proprietário do imóvel */
export async function sendReportToOwner(options: {
  ownerEmail: string
  ownerName: string
  propertyTitle: string
  reportUrl: string
  password: string
}) {
  if (!process.env.SMTP_HOST) return

  const from = process.env.EMAIL_FROM ?? 'noreply@paulopop.com.br'
  const agentName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Paulo Pop'

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#F0F4F8;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:32px 16px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;">
              <tr>
                <td style="background:#1e3a8a;padding:24px 32px;">
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;">${e(agentName)}</h1>
                  <p style="margin:4px 0 0;color:#93C5FD;font-size:13px;">Relatório de Análise de Mercado</p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <h2 style="color:#1e3a8a;margin:0 0 16px;font-size:18px;">Olá, ${e(options.ownerName)}!</h2>
                  <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 16px;">
                    Preparamos um relatório completo de análise de mercado para o seu imóvel:
                    <strong style="color:#1e3a8a;">${e(options.propertyTitle)}</strong>.
                  </p>
                  <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 24px;">
                    Acesse o relatório pelo link abaixo usando a senha fornecida:
                  </p>

                  <table width="100%" cellpadding="12" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:8px;margin-bottom:24px;">
                    <tr style="background:#F0F4F8;">
                      <td style="color:#1e3a8a;font-weight:bold;font-size:13px;width:30%;">Senha</td>
                      <td style="color:#1E293B;font-size:16px;font-family:monospace;letter-spacing:4px;font-weight:bold;">${e(options.password)}</td>
                    </tr>
                  </table>

                  <a href="${options.reportUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;margin-bottom:16px;">
                    Acessar Relatório
                  </a>

                  <p style="color:#94A3B8;font-size:12px;margin:16px 0 0;">
                    Se o botão não funcionar, copie e cole este link: ${options.reportUrl}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#F0F4F8;padding:16px 32px;border-top:1px solid #E2E8F0;">
                  <p style="margin:0;color:#94A3B8;font-size:12px;">Paulo Pop — Portal Imobiliário</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from,
      to: options.ownerEmail,
      subject: `Relatório de análise de mercado — ${e(options.propertyTitle)}`,
      html,
    })
  } catch (err) {
    console.error('[Email] Falha ao enviar relatório ao proprietário:', err)
  }
}

/** Função genérica para envio de e-mail */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!process.env.SMTP_HOST) throw new Error('SMTP não configurado')
  const transporter = getTransporter()
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? 'noreply@paulopop.com.br',
    to,
    subject,
    html,
  })
}
