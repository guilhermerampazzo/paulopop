export const revalidate = 300

import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { LegalText } from '@/components/public/LegalText'
import { defaultPrivacyPolicy } from '@/lib/legal-defaults'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Como tratamos os seus dados pessoais neste site, conforme a LGPD.',
  alternates: { canonical: '/politica-de-privacidade' },
  robots: { index: true, follow: true },
}

export default async function Page() {
  const config = await prisma.siteConfig.findFirst({ select: { privacyPolicy: true, ownerName: true, ownerCreci: true, ownerEmail: true, ownerCompany: true, updatedAt: true } })
  const text = config?.privacyPolicy?.trim() || defaultPrivacyPolicy({
    name: config?.ownerName ?? 'Paulo Pop',
    creci: config?.ownerCreci,
    email: config?.ownerEmail,
    company: config?.ownerCompany,
    site: SITE_URL.replace(/^https?:\/\//, ''),
  })
  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <div className="bg-[#1e3a8a] py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-[#2563eb] text-xs font-semibold uppercase tracking-widest mb-2">Legal</p>
          <h1 className="font-display text-4xl font-bold text-white">Política de Privacidade</h1>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="bg-white rounded-2xl p-8 shadow-sm">
          <LegalText text={text} />
          {config?.updatedAt && (
            <p className="mt-10 text-xs text-gray-400">Última atualização: {new Intl.DateTimeFormat('pt-BR').format(config.updatedAt)}</p>
          )}
        </article>
      </div>
    </div>
  )
}
