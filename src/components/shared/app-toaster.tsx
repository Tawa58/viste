import { Toaster } from 'sonner'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react'
import { VisteLoader } from '@/components/shared/loader'

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      expand
      gap={10}
      offset={16}
      duration={3800}
      visibleToasts={5}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'group flex w-[min(100vw-2rem,22rem)] items-start gap-3 rounded-2xl border border-border/80 bg-card/95 p-3.5 text-sm text-foreground shadow-elevated backdrop-blur-md',
          title: 'font-semibold leading-snug tracking-tight',
          description: 'mt-0.5 text-xs leading-relaxed text-muted-foreground',
          actionButton:
            'mt-2 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground',
          cancelButton:
            'mt-2 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-foreground',
          closeButton:
            'absolute right-2 top-2 rounded-full border border-border/70 bg-card p-0.5 text-muted-foreground opacity-70 transition hover:opacity-100',
          success: 'border-success/25',
          error: 'border-destructive/25',
          warning: 'border-warning/25',
          info: 'border-primary/20',
          loading: 'border-border/80',
        },
      }}
      icons={{
        success: (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        ),
        error: (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/12 text-destructive">
            <XCircle className="h-4 w-4" />
          </span>
        ),
        warning: (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/12 text-warning">
            <AlertTriangle className="h-4 w-4" />
          </span>
        ),
        info: (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Info className="h-4 w-4" />
          </span>
        ),
        loading: (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-accent">
            <VisteLoader size="sm" label="Loading" />
          </span>
        ),
      }}
    />
  )
}
