import { cn } from '@/lib/utils'

type LoaderSize = 'sm' | 'md' | 'lg' | 'xl'

const sizeMap: Record<LoaderSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
}

const strokeMap: Record<LoaderSize, number> = {
  sm: 2.25,
  md: 2.5,
  lg: 2.75,
  xl: 3,
}

/** Minimal arc spinner — modern SaaS style, not a GIF-like dual ring. */
export function VisteLoader({
  size = 'md',
  className,
  label = 'Loading',
}: {
  size?: LoaderSize
  className?: string
  label?: string
}) {
  const stroke = strokeMap[size]
  return (
    <svg
      role="status"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('viste-arc shrink-0 text-accent', sizeMap[size], className)}
    >
      <title>{label}</title>
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth={stroke}
      />
      <circle
        className="viste-arc-path"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray="40 80"
      />
    </svg>
  )
}

/** Soft indeterminate bar — good for page headers without looking dated. */
export function ProgressPulse({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-0.5 w-full overflow-hidden rounded-full bg-muted',
        className,
      )}
      role="progressbar"
      aria-label="Loading"
    >
      <div className="viste-progress-bar h-full w-1/3 rounded-full bg-accent" />
    </div>
  )
}

export function PageLoader({
  title = 'Loading',
  description = 'Just a moment…',
  className,
}: {
  title?: string
  description?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-[16rem] flex-col items-center justify-center gap-5 px-6 py-12 animate-fade-in',
        className,
      )}
    >
      <VisteLoader size="lg" label={title} />
      <div className="max-w-xs space-y-3 text-center">
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <ProgressPulse className="mx-auto max-w-[9rem]" />
      </div>
    </div>
  )
}

export function InlineLoader({
  label = 'Working…',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <VisteLoader size="sm" label={label} />
      <span>{label}</span>
    </div>
  )
}

export function ProcessOverlay({
  open,
  title = 'Please wait',
  description = 'This will only take a moment…',
}: {
  open: boolean
  title?: string
  description?: string
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/60 backdrop-blur-[2px] animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="mx-4 w-full max-w-xs rounded-2xl border border-border/60 bg-card/95 p-5 shadow-elevated animate-scale-in">
        <div className="flex flex-col items-center gap-3 text-center">
          <VisteLoader size="md" label={title} />
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <ProgressPulse className="mt-1" />
        </div>
      </div>
    </div>
  )
}
