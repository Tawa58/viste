import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  compact = false,
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone?: 'default' | 'accent' | 'warning' | 'success'
  compact?: boolean
}) {
  return (
    <Card className={cn('overflow-hidden', compact && 'rounded-lg shadow-none')}>
      <CardContent
        className={cn(
          'flex items-center justify-between',
          compact ? 'gap-1.5 px-2 py-1' : 'gap-2 px-3.5 py-2.5',
        )}
      >
        <div className="min-w-0">
          <p
            className={cn(
              'font-medium leading-tight text-muted-foreground',
              compact
                ? 'line-clamp-2 text-[9px] leading-snug'
                : 'truncate text-[11px] leading-none',
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              'truncate font-sans font-semibold leading-none tracking-tight',
              compact ? 'mt-0.5 text-xs' : 'mt-1.5 text-base',
            )}
          >
            {value}
          </p>
          {hint && (
            <p className={cn('text-muted-foreground', compact ? 'mt-0.5 text-[9px]' : 'mt-1 text-[10px]')}>
              {hint}
            </p>
          )}
        </div>
        <div
          className={cn(
            'shrink-0 rounded-md',
            compact ? 'p-0.5' : 'p-1.5',
            tone === 'default' && 'bg-muted text-muted-foreground',
            tone === 'accent' && 'bg-accent/10 text-accent',
            tone === 'warning' && 'bg-warning/10 text-warning',
            tone === 'success' && 'bg-success/10 text-success',
          )}
        >
          <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        </div>
      </CardContent>
    </Card>
  )
}
