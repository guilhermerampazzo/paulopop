import { ReportClient } from './ReportClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Relatório de Análise de Mercado', // v1.4: o sufixo "| Paulo Pop" vem do layout (antes saía duplicado)
  robots: 'noindex',
}

export default function RelatorioPage({ params }: { params: { propertyId: string } }) {
  return <ReportClient propertyId={params.propertyId} />
}
