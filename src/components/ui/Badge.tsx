import { cn } from '../../lib/utils'

type BadgeVariant = 'success' | 'danger' | 'warning' | 'neutral' | 'primary' | 'yellow'

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
  neutral: 'bg-gray-100 text-gray-700',
  primary: 'bg-blue-100 text-blue-800',
  yellow: 'bg-yellow-100 text-yellow-800',
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

