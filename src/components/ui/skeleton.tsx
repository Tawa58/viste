import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('skeleton-shimmer rounded-xl bg-muted', className)}
      {...props}
    />
  )
}
