/**
 * v1.4 — Hub do corretor: cartão único com foto inteira (sem corte), nome, WhatsApp com ícone,
 * CRECI e vínculo com a imobiliária. Nada é truncado: as linhas quebram dentro do cartão.
 * Server component (sem hooks); usado na página do imóvel e na ficha impressa.
 */
import { Building2 } from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import type { AgentDisplay } from '@/lib/agent-display'
import { cn } from '@/lib/utils'

interface Props {
  agent: AgentDisplay
  /** texto inicial da conversa no WhatsApp */
  message?: string
  /** compacto = ficha impressa */
  variant?: 'default' | 'print'
  className?: string
}

export function AgentCard({ agent, message, variant = 'default', className }: Props) {
  const wa = agent.whatsappDigits ? `https://wa.me/${agent.whatsappDigits}${message ? `?text=${encodeURIComponent(message)}` : ''}` : null
  const print = variant === 'print'
  return (
    <div className={cn('agent-card flex items-center gap-4', className)} data-agent-card>
      <div className={cn('flex-shrink-0 overflow-hidden rounded-xl bg-[#F0F4F8] flex items-center justify-center', print ? 'h-24 w-20' : 'h-28 w-24')}>
        {agent.avatarUrl ? (
          // Foto inteira: object-contain ajusta o tamanho sem cortar a imagem.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={agent.avatarUrl} alt={`Foto de ${agent.name}`} className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <Building2 className="h-9 w-9 text-gray-300" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn('font-bold text-[#1e3a8a] leading-snug break-words', print ? 'text-sm' : 'text-base')}>{agent.name}</p>
        {agent.phone && (
          wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Falar com ${agent.name} no WhatsApp: ${agent.phone}`} className="flex items-center gap-1.5 text-sm font-semibold text-[#128C7E] hover:underline whitespace-nowrap">
              <WhatsAppIcon className="h-4 w-4 flex-shrink-0 text-[#25D366]" />
              {agent.phone}
            </a>
          ) : (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 whitespace-nowrap"><WhatsAppIcon className="h-4 w-4 flex-shrink-0 text-[#25D366]" />{agent.phone}</p>
          )
        )}
        {agent.creci && <p className="text-xs text-gray-600 leading-snug break-words">{agent.creci}</p>}
        {agent.companyLine && <p className="text-xs text-gray-600 leading-snug break-words">{agent.companyLine}</p>}
      </div>
    </div>
  )
}
