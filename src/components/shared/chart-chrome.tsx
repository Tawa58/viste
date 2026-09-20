import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const chartAxisProps = {
  stroke: 'var(--muted-foreground)',
  fontSize: 11,
  tickLine: false as const,
  axisLine: false as const,
}

export const chartGridProps = {
  stroke: 'var(--border)',
  strokeDasharray: '3 6',
  vertical: false as const,
}

type TooltipItem = {
  name?: string | number
  value?: number | string
  color?: string
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean
  payload?: TooltipItem[]
  label?: string | number
  valueFormatter?: (value: number, name: string) => string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-border/80 bg-card/95 px-3 py-2 shadow-elevated backdrop-blur-sm">
      {label != null && label !== '' && (
        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((item, index) => {
          const value = typeof item.value === 'number' ? item.value : Number(item.value ?? 0)
          const name = String(item.name ?? '')
          return (
            <div key={`${name}-${index}`} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: String(item.color ?? 'var(--primary)') }}
              />
              <span className="text-muted-foreground">{name}</span>
              <span className="ml-auto font-semibold tabular-nums text-foreground">
                {valueFormatter ? valueFormatter(value, name) : value.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string }[]
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
        >
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          {item.label}
        </div>
      ))}
    </div>
  )
}

export function ChartCard({
  title,
  description,
  legend,
  children,
  className,
}: {
  title: string
  description?: string
  legend?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/70 bg-gradient-to-b from-card to-card/80 shadow-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 pb-1 pt-3.5">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {legend}
      </div>
      <div className="px-2 pb-3 pt-1 sm:px-3">{children}</div>
    </div>
  )
}
