'use client'

import { useState, useEffect, useTransition } from 'react'
import { UserCog, Plus, Pencil, UserX, UserCheck, X, Save, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface Corretor {
  id: string
  name: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'AGENT'
  phone?: string
  whatsapp?: string
  creci?: string
  company?: string
  avatarUrl?: string
  active: boolean
  createdAt: string
  _count: { properties: number }
}

interface FormData {
  name: string
  email: string
  password: string
  role: string
  phone: string
  whatsapp: string
  creci: string
  company: string
  companyCreci: string
  publicName: string
  companyRole: string
  bio: string
}

const EMPTY_FORM: FormData = {
  name: '', email: '', password: '', role: 'AGENT',
  phone: '', whatsapp: '', creci: '', company: '', companyCreci: '', publicName: '', companyRole: '', bio: '',
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  AGENT: 'Corretor',
}

export default function CorretoresPage() {
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'novo' | Corretor | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [, startTransition] = useTransition()

  function loadCorretores() {
    fetch('/api/admin/corretores')
      .then(r => r.json())
      .then((data: Corretor[]) => setCorretores(data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCorretores() }, [])

  function openNovo() {
    setForm(EMPTY_FORM)
    setShowPassword(false)
    setModal('novo')
  }

  function openEdit(c: Corretor) {
    setForm({
      name: c.name, email: c.email, password: '',
      role: c.role, phone: c.phone ?? '', whatsapp: c.whatsapp ?? '',
      creci: c.creci ?? '', company: c.company ?? '',
      companyCreci: '', publicName: (c as { publicName?: string | null }).publicName ?? '', companyRole: (c as { companyRole?: string | null }).companyRole ?? '', bio: '',
    })
    setShowPassword(false)
    setModal(c)
  }

  async function handleSave() {
    setSaving(true)
    setFeedback(null)
    try {
      const isNew = modal === 'novo'
      const url = isNew ? '/api/admin/corretores' : `/api/admin/corretores/${(modal as Corretor).id}`
      const method = isNew ? 'POST' : 'PUT'
      const body: Record<string, string> = {
        name: form.name, email: form.email, role: form.role,
        phone: form.phone, whatsapp: form.whatsapp, creci: form.creci,
        company: form.company, companyCreci: form.companyCreci, publicName: form.publicName, companyRole: form.companyRole, bio: form.bio,
      }
      if (form.password) body.password = form.password

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        throw new Error(err.error ?? 'Erro ao salvar')
      }
      setFeedback({ type: 'success', msg: isNew ? 'Corretor cadastrado com sucesso!' : 'Dados atualizados!' })
      setModal(null)
      startTransition(() => { loadCorretores() })
    } catch (e) {
      setFeedback({ type: 'error', msg: e instanceof Error ? e.message : 'Erro ao salvar' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(c: Corretor) {
    await fetch(`/api/admin/corretores/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active }),
    })
    loadCorretores()
  }

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a8a] flex items-center gap-2">
            <UserCog className="w-6 h-6" /> Corretores
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os corretores com acesso ao sistema</p>
        </div>
        <button
          onClick={openNovo}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white text-sm font-medium rounded-lg hover:bg-[#172554] transition-colors"
          aria-label="Cadastrar novo corretor"
        >
          <Plus className="w-4 h-4" /> Novo Corretor
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          role="alert"
          aria-live="polite"
          className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.type === 'success'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {feedback.msg}
          <button onClick={() => setFeedback(null)} className="ml-auto" aria-label="Fechar alerta"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Corretor</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Contato</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Perfil</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Imóveis</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {corretores.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhum corretor cadastrado</td></tr>
                )}
                {corretores.map(c => (
                  <tr key={c.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!c.active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#2563eb] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                      {c.phone && <p>{c.phone}</p>}
                      {c.creci && <p className="text-xs text-gray-400">CRECI: {c.creci}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.role === 'SUPER_ADMIN' || c.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {ROLE_LABELS[c.role] ?? c.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{c._count.properties}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {c.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#1e3a8a]"
                          aria-label={`Editar ${c.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(c)}
                          className={`p-1.5 rounded hover:bg-gray-100 ${c.active ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'}`}
                          aria-label={c.active ? `Desativar ${c.name}` : `Reativar ${c.name}`}
                        >
                          {c.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de cadastro/edição */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-[#1e3a8a]">
                {modal === 'novo' ? 'Cadastrar Corretor' : `Editar: ${(modal as Corretor).name}`}
              </h2>
              <button onClick={() => setModal(null)} aria-label="Fechar modal">
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <FormField label="Nome completo *" value={form.name} onChange={v => set('name', v)} />
              <FormField label="E-mail *" value={form.email} onChange={v => set('email', v)} type="email" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {modal !== 'novo' && <span className="text-gray-400 font-normal">(deixe em branco para não alterar)</span>}
                  {modal === 'novo' && ' *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] pr-10"
                    aria-label="Senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de acesso</label>
                <select
                  value={form.role}
                  onChange={e => set('role', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  aria-label="Perfil de acesso"
                >
                  <option value="AGENT">Corretor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <FormField label="CRECI" value={form.creci} onChange={v => set('creci', v)} />
              <FormField label="Empresa" value={form.company} onChange={v => set('company', v)} />
              <FormField label="CRECI da Empresa" value={form.companyCreci} onChange={v => set('companyCreci', v)} />
              <FormField label="Nome que aparece no site" value={form.publicName} onChange={v => set('publicName', v)} />
              <FormField label="Vínculo (ex.: Corretor Associado)" value={form.companyRole} onChange={v => set('companyRole', v)} />
              <FormField label="Telefone" value={form.phone} onChange={v => set('phone', v)} type="tel" />
              <FormField label="WhatsApp (com DDI)" value={form.whatsapp} onChange={v => set('whatsapp', v)} type="tel" />
              <FormField label="Bio" value={form.bio} onChange={v => set('bio', v)} multiline />
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white rounded-xl text-sm font-medium hover:bg-[#172554] disabled:opacity-60"
                aria-label="Salvar corretor"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FormField({
  label, value, onChange, type = 'text', multiline = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  multiline?: boolean
}) {
  const cls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]'
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className={cls} aria-label={label} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} className={cls} aria-label={label} />
      )}
    </div>
  )
}
