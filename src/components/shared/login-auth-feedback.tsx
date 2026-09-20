import { Check, X } from 'lucide-react'
import { VisteLoader } from '@/components/shared/loader'
import { cn } from '@/lib/utils'

export type LoginAuthStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Centered auth feedback over the login view:
 * loading spinner → green check + message, or red X + message.
 * Light transparent scrim — page stays visible behind it.
 */
export function LoginAuthFeedback({
  status,
  className,
}: {
  status: Exclude<LoginAuthStatus, 'idle'>
  className?: string
}) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-[70] flex items-center justify-center px-4',
        'bg-background/25 backdrop-blur-[1px] animate-fade-in',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy={status === 'loading'}
    >
      <div
        className={cn(
          'auth-feedback-pop flex min-h-[8.5rem] w-[13rem] flex-col items-center justify-center gap-3',
          'rounded-2xl border border-border/50 bg-card/80 px-4 py-5 shadow-elevated backdrop-blur-md',
        )}
      >
        {status === 'loading' ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <span className="auth-loader-halo absolute inset-0 rounded-full bg-accent/15" />
              <VisteLoader size="xl" label="Signing in" className="relative text-accent" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Signing you in…</p>
          </div>
        ) : null}

        {status === 'success' ? (
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success ring-1 ring-success/30">
              <Check
                className="auth-mark h-8 w-8 stroke-[2.5]"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </div>
            <p className="text-sm font-semibold tracking-tight text-success">
              Logged in successfully
            </p>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/12 text-destructive ring-1 ring-destructive/30">
              <X
                className="auth-mark h-8 w-8 stroke-[2.5]"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </div>
            <p className="text-sm font-semibold tracking-tight text-destructive">Login failed</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
