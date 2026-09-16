import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Alert({
  title,
  children,
  tone = 'info',
  className,
}: {
  title: string
  children?: ReactNode
  tone?: 'info' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3',
        tone === 'info' && 'border-primary/20 bg-primary/5 text-foreground',
        tone === 'success' && 'border-success/20 bg-success/5',
        tone === 'warning' && 'border-warning/20 bg-warning/5',
        tone === 'danger' && 'border-destructive/20 bg-destructive/5',
        className,
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
    </div>
  )
}
