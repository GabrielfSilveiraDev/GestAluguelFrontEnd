import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface TooltipProps {
  content: string
  children: ReactNode
  className?: string
}

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <div className={cn('relative group inline-flex', className)}>
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
      </div>
    </div>
  )
}

