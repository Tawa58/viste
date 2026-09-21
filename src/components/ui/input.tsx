import * as React from 'react'
import { cn } from '@/lib/utils'
import { useFieldId } from '@/components/ui/field'

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, id, name, ...props }, ref) => {
    const fieldId = useFieldId(id)
    return (
      <input
        type={type}
        id={fieldId}
        name={name ?? fieldId}
        className={cn(
          'flex h-11 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm shadow-sm transition-all placeholder:text-muted-foreground hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
