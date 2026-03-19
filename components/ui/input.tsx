import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes } from 'react'

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-lhc-border bg-lhc-surface px-3 py-2 text-sm text-lhc-text-main ring-offset-background placeholder:text-lhc-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lhc-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
