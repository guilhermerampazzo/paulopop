'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card } from '@/components/ui/Card'

const STATUS_COLORS: Record<string, string> = {
  Ativo: '#10B981',
  Rascunho: '#F59E0B',
  Vendido: '#2563eb',
  Alugado: '#8B5CF6',
  Inativo: '#94A3B8',
  Suspenso: '#EF4444',
}

interface LeadsChartData {
  month: string
  total: number
}

interface StatusChartData {
  name: string
  value: number
  status: string
}

interface DashboardChartsProps {
  leadsChartData: LeadsChartData[]
  statusChartData: StatusChartData[]
}

export function DashboardCharts({ leadsChartData, statusChartData }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Gráfico de barras — Leads por mês */}
      <Card className="lg:col-span-2">
        <h2 className="font-semibold text-[#1e3a8a] mb-4">Leads por Mês</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={leadsChartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} />
            <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(value) => [value, 'Leads']}
            />
            <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Gráfico donut — Imóveis por status */}
      <Card>
        <h2 className="font-semibold text-[#1e3a8a] mb-4">Imóveis por Status</h2>
        {statusChartData.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
            Nenhum imóvel cadastrado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {statusChartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[entry.name] ?? '#CBD5E0'}
                  />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}
