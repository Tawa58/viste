import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function DataTableShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'min-w-0 max-w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card',
        className,
      )}
    >
      <div className="overflow-x-auto overscroll-x-contain">{children}</div>
    </div>
  )
}

export function DataTable({ className, ...props }: ComponentProps<'table'>) {
  return (
    <table
      className={cn('w-full min-w-[640px] border-collapse text-left text-sm', className)}
      {...props}
    />
  )
}

export function DataTableHead({ className, ...props }: ComponentProps<'thead'>) {
  return (
    <thead
      className={cn(
        'sticky top-0 z-10 border-b border-border bg-muted/70 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur',
        className,
      )}
      {...props}
    />
  )
}

export function DataTableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function DataTableRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'border-b border-border/70 transition-colors hover:bg-muted/50',
        className,
      )}
      {...props}
    />
  )
}

export function DataTableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-3 py-3 align-middle sm:px-4 sm:py-3.5', className)} {...props} />
}

export function DataTableHeaderCell({ className, ...props }: ComponentProps<'th'>) {
  return <th className={cn('px-3 py-3 font-semibold sm:px-4', className)} {...props} />
}
