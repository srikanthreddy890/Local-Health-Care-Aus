import { cn } from '@/lib/utils'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lhc-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        size === 'default' && 'h-10 px-4 py-2 text-sm',
        size === 'sm'      && 'h-8 px-3 text-xs',
        size === 'lg'      && 'h-12 px-8 text-base',
        size === 'icon'    && 'h-10 w-10',
        variant === 'default'     && 'bg-lhc-primary text-white hover:bg-lhc-primary-hover',
        variant === 'outline'     && 'border border-lhc-border bg-transparent text-lhc-text-main hover:bg-lhc-background',
        variant === 'ghost'       && 'text-lhc-text-main hover:bg-lhc-background',
        variant === 'destructive' && 'bg-destructive text-white hover:bg-destructive/90',
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export { Button }
