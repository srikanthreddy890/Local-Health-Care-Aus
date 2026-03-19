import { cn } from '@/lib/utils'

export interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'purple' | 'orange'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        {
          'bg-lhc-primary text-white': variant === 'default',
          'bg-lhc-surface text-lhc-text-main border border-lhc-border': variant === 'secondary',
          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300': variant === 'destructive',
          'border border-lhc-border text-lhc-text-main bg-transparent': variant === 'outline',
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300': variant === 'success',
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300': variant === 'warning',
          'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300': variant === 'purple',
          'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300': variant === 'orange',
        },
        className,
      )}
    >
      {children}
    </span>
  )
}
