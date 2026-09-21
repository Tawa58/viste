import * as React from 'react'
import { cn } from '@/lib/utils'
import { useOptionalFieldId } from '@/components/ui/field'

export function Label({
  className,
  htmlFor,
  ...props
}: React.ComponentProps<'label'>) {
  const fieldId = useOptionalFieldId()
  return (
    <label
      htmlFor={htmlFor ?? fieldId}
      className={cn('text-sm font-medium text-foreground leading-none', className)}
      {...props}
    />
  )
}
