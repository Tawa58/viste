import { Toaster } from 'sonner'
import { toastIcon } from '@/lib/notify'

/**
 * All toasts match the login feedback card: centered on screen, large round
 * status icon above a centered title and description.
 */
export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      closeButton
      gap={10}
      duration={3200}
      visibleToasts={3}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'viste-toast group relative flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card px-5 py-6 text-center text-sm text-foreground shadow-elevated',
          icon: 'flex items-center justify-center',
          content: 'flex flex-col items-center gap-1',
          title: 'text-sm font-semibold leading-snug tracking-tight',
          description: 'max-w-[18rem] text-xs leading-relaxed text-muted-foreground',
          actionButton:
            'mt-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground',
          cancelButton:
            'mt-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground',
          closeButton:
            'absolute right-2.5 top-2.5 rounded-full border border-border/70 bg-card p-0.5 text-muted-foreground opacity-70 transition hover:opacity-100',
          success: '[&_[data-title]]:text-success',
          error: '[&_[data-title]]:text-destructive',
          warning: '[&_[data-title]]:text-warning',
          info: '',
          loading: '',
        },
      }}
      icons={{
        success: toastIcon('success'),
        error: toastIcon('error'),
        warning: toastIcon('warning'),
        info: toastIcon('info'),
        loading: toastIcon('loading'),
      }}
    />
  )
}
