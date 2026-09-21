import * as React from 'react'
import { cn } from '@/lib/utils'
import { useFieldId } from '@/components/ui/field'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, id, name, ...props }, ref) => {
    const fieldId = useFieldId(id)
    return (
      <textarea
        id={fieldId}
        name={name ?? fieldId}
        className={cn(
          'flex min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'
