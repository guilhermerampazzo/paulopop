import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  showCount?: boolean
  maxLength?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, showCount, maxLength, value, ...props }, ref) => {
    const currentLength = typeof value === 'string' ? value.length : 0
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          maxLength={maxLength}
          value={value}
          className={cn(
            'w-full border rounded-lg px-3 py-2 text-sm resize-y transition-colors min-h-[100px]',
            'focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent',
            error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400',
            className
          )}
          {...props}
        />
        <div className="flex justify-between">
          <div>{error && <p className="text-xs text-red-500">{error}</p>}{hint && !error && <p className="text-xs text-gray-400">{hint}</p>}</div>
          {showCount && maxLength && (
            <p className={cn('text-xs', currentLength > maxLength * 0.9 ? 'text-orange-500' : 'text-gray-400')}>
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
