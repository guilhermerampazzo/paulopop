import { redirect } from 'next/navigation'

/** v1.2 — a antiga "Análise de Mercado" foi substituída pelos Estudos de mercado (padrão RE/MAX). */
export default function AnaliseMercadoPage() {
  redirect('/admin/estudos')
}
