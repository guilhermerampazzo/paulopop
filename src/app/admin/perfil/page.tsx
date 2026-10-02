'use client'

/**
 * v1.1 — Meu perfil: dados do corretor logado usados nos anúncios, e-mails, relatórios e no estudo de mercado.
 */
import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Save, Upload, UserCircle2, CheckCircle, AlertCircle, Loader2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AgentCard } from '@/components/public/AgentCard'
import { agentDisplay, ownerFallback, profileGaps, isSiteOwner, type OwnerConfigLike } from '@/lib/agent-display'

interface Profile {
  name?: string; email?: string; role?: string; phone?: string | null; whatsapp?: string | null; creci?: string | null
  bio?: string | null; avatarUrl?: string | null; company?: string | null; companyCreci?: string | null
  publicName?: string | null; companyRole?: string | null
  instagram?: string | null; facebook?: string | null; linkedin?: string | null; youtube?: string | null; telegram?: string | null; twitter?: string | null
}

const ROLE: Record<string, string> = { SUPER_ADMIN: 'Super administrador', ADMIN: 'Administrador', AGENT: 'Corretor' }

export default function PerfilPage() {
  const { update } = useSession()
  const [p, setP] = useState<Profile>({})
  // v1.5: Configurações → Perfil (reserva do cartão e botão de cópia)
  const [cfg, setCfg] = useState<OwnerConfigLike | null>(null)
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/perfil').then(r => r.json()).then((d: Profile & { configProfile?: OwnerConfigLike | null }) => {
      const { configProfile, ...profile } = d ?? {}
      setP(profile); setCfg(configProfile ?? null)
    }).finally(() => setLoading(false))
  }, [])

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setP(prev => ({ ...prev, [k]: e.target.value }))

  async function uploadAvatar(file: File) {
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) { setFeedback({ type: 'error', msg: 'Falha ao enviar a foto' }); return }
    const { url } = await res.json() as { url: string }
    setP(prev => ({ ...prev, avatarUrl: url }))
  }

  async function save() {
    if (pw.newPassword && pw.newPassword !== pw.confirm) { setFeedback({ type: 'error', msg: 'A confirmação da senha não confere' }); return }
    setSaving(true); setFeedback(null)
    try {
      const res = await fetch('/api/admin/perfil', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, currentPassword: pw.currentPassword || undefined, newPassword: pw.newPassword || undefined }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'Erro ao salvar')
      setP(d); setPw({ currentPassword: '', newPassword: '', confirm: '' })
      await update?.({ name: d.name })
      setFeedback({ type: 'success', msg: 'Perfil salvo. Estes dados aparecem nos anúncios, e-mails e relatórios.' })
    } catch (e) {
      setFeedback({ type: 'error', msg: e instanceof Error ? e.message : 'Erro ao salvar' })
    } finally { setSaving(false) }
  }

  /** v1.5: preenche os campos vazios (e a imobiliária, se diferente) com os dados de Configurações → Perfil. Só grava ao clicar em Salvar. */
  function copyFromConfig() {
    if (!cfg) return
    const pick = (cur: string | null | undefined, v: string | null | undefined) => (cur && cur.trim() ? cur : (v ?? cur ?? ''))
    setP(prev => ({
      ...prev,
      avatarUrl: pick(prev.avatarUrl, cfg.ownerPhotoUrl),
      publicName: pick(prev.publicName, cfg.ownerName),
      creci: pick(prev.creci, cfg.ownerCreci),
      whatsapp: pick(prev.whatsapp, cfg.ownerWhatsapp),
      phone: pick(prev.phone, cfg.ownerPhone),
      company: cfg.ownerCompany?.trim() ? cfg.ownerCompany : prev.company,
      companyRole: pick(prev.companyRole, 'Corretor Associado'),
    }))
    setFeedback({ type: 'success', msg: 'Dados copiados das Configurações. Confira e clique em Salvar.' })
  }

  const input = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent'
  // função (não componente) para os inputs não perderem o foco a cada tecla
  const field = (label: string, k: keyof Profile, placeholder?: string, type = 'text') => (
    <div>
      <label htmlFor={`f-${k}`} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input id={`f-${k}`} type={type} value={(p[k] as string) ?? ''} onChange={set(k)} placeholder={placeholder} className={input} />
    </div>
  )

  const agentLike = { name: p.name ?? '', publicName: p.publicName, phone: p.phone, whatsapp: p.whatsapp, creci: p.creci, company: p.company, companyRole: p.companyRole, avatarUrl: p.avatarUrl, role: p.role, email: p.email }
  const owner = isSiteOwner(agentLike, cfg)
  const gaps = loading ? [] : profileGaps(agentLike, cfg)

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" /></div>

  return (
    <div className="max-w-3xl space-y-6">
      {feedback && (
        <div role="alert" className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${feedback.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {feedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{feedback.msg}
        </div>
      )}

      {/* v1.5: aviso de perfil incompleto, com o que falta e o que o site está usando no lugar */}
      {gaps.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Seu perfil está incompleto</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            {gaps.map(g => <li key={g.field + g.label}>{g.label}{g.fromConfig ? ' — o site está usando o de Configurações → Perfil' : ''}</li>)}
          </ul>
          {cfg && owner && (
            <button type="button" onClick={copyFromConfig} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-[#2563eb]">
              <Copy className="h-3.5 w-3.5" /> Copiar das Configurações
            </button>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-5">
        <div className="flex items-center gap-5">
          {p.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover shadow" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#eff6ff]"><UserCircle2 className="h-10 w-10 text-[#2563eb]" /></div>
          )}
          <div>
            <p className="font-semibold text-[#1e3a8a]">{p.name}</p>
            <p className="text-xs text-gray-500">{p.email} · {ROLE[p.role ?? 'AGENT']}</p>
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-xs hover:border-[#2563eb]">
              <Upload className="h-3.5 w-3.5" /> Trocar foto
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f) }} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {field('Nome', 'name')}
          {field('Nome que aparece no site', 'publicName', 'Corretor Paulo Pop')}
          {field('CRECI', 'creci', '12896/DF')}
          {field('Telefone', 'phone', '(61) 9xxxx-xxxx')}
          {field('WhatsApp', 'whatsapp', '(61) 9xxxx-xxxx')}
          {field('Vínculo com a imobiliária', 'companyRole', 'Corretor Associado')}
          {field('Imobiliária / franquia', 'company', 'RE/MAX INOVELAR')}
          {field('CRECI da imobiliária (J)', 'companyCreci', '24.732-J')}
        </div>
        {/* v1.4: prévia do hub do corretor, como sai na página do imóvel e na ficha impressa */}
        <div className="rounded-xl border border-dashed border-gray-300 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">Como aparece no site</p>
          <AgentCard agent={agentDisplay(agentLike, ownerFallback(agentLike, cfg))} />
          <p className="mt-3 text-xs text-gray-500">A foto aparece inteira, sem corte. Para um enquadramento melhor, envie uma foto na vertical (proporção 4:5).</p>
        </div>
        <div>
          <label htmlFor="f-bio" className="block text-sm font-medium text-gray-700 mb-1">Apresentação (aparece no Sobre e nos relatórios)</label>
          <textarea id="f-bio" rows={4} value={p.bio ?? ''} onChange={set('bio')} className={input} />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        <h2 className="font-semibold text-[#1e3a8a]">Redes sociais</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('Instagram', 'instagram', 'https://instagram.com/...')}
          {field('Facebook', 'facebook')}
          {field('LinkedIn', 'linkedin')}
          {field('YouTube', 'youtube')}
          {field('Telegram', 'telegram')}
          {field('X / Twitter', 'twitter')}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        <h2 className="font-semibold text-[#1e3a8a]">Trocar senha</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="pw-cur">Senha atual</label><input id="pw-cur" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} className={input} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="pw-new">Nova senha (mín. 8)</label><input id="pw-new" type="password" autoComplete="new-password" value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} className={input} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="pw-conf">Confirmar</label><input id="pw-conf" type="password" autoComplete="new-password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} className={input} /></div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving} disabled={saving}><Save className="h-4 w-4" /> Salvar perfil</Button>
      </div>
    </div>
  )
}
