import * as React from 'react'
import { cn } from '@/lib/utils'
import { useFieldId } from '@/components/ui/field'

export function Select({
  className,
  children,
  id,
  name,
  ...props
}: React.ComponentProps<'select'>) {
  const fieldId = useFieldId(id)
  return (
    <select
      id={fieldId}
      name={name ?? fieldId}
      className={cn(
        'flex h-11 w-full appearance-none rounded-xl border border-input bg-card px-3.5 py-2 text-sm shadow-sm transition-all hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
