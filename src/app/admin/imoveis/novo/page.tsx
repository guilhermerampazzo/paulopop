'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PropertyCreateModal } from '@/components/admin/PropertyCreateModal'

export default function NovoImovelPage() {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  // v1.5: /admin/imoveis/novo?empreendimento={id} (menu de ações do empreendimento)
  const [emp, setEmp] = useState<{ id: string; name: string | null } | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('empreendimento')
    if (!id) { setReady(true); return }
    fetch(`/api/admin/empreendimentos/${encodeURIComponent(id)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((d: { id: string; name: string } | null) => setEmp(d ? { id: d.id, name: d.name } : null))
      .catch(() => setEmp(null))
      .finally(() => setReady(true))
  }, [])

  const handleClose = () => {
    setOpen(false)
    router.push('/admin/imoveis')
  }

  return (
    <div>
      {ready && <PropertyCreateModal open={open} onClose={handleClose} empreendimentoId={emp?.id ?? null} empreendimentoName={emp?.name ?? null} />}
    </div>
  )
}
