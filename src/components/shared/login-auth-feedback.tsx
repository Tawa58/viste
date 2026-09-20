import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import { VisteLoader } from '@/components/shared/loader'
import { cn } from '@/lib/utils'

export type LoginAuthStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Centered auth feedback over the login view (portaled to body so it cannot be
 * clipped by overflow/transform ancestors): loading → green check, or red X.
 */
export function LoginAuthFeedback({
  status,
  className,
}: {
  status: Exclude<LoginAuthStatus, 'idle'>
  className?: string
}) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-[200] flex items-center justify-center px-4',
        'bg-background/55 backdrop-blur-[2px] animate-fade-in',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy={status === 'loading'}
      data-login-auth-feedback={status}
    >
      <div
        className={cn(
          'auth-feedback-pop flex min-h-[9.5rem] w-[14.5rem] flex-col items-center justify-center gap-3',
          'rounded-2xl border border-border bg-card px-5 py-6 shadow-elevated',
        )}
      >
        {status === 'loading' ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <span className="auth-loader-halo absolute inset-0 rounded-full bg-accent/20" />
              <VisteLoader size="xl" label="Signing in" className="relative text-accent" />
            </div>
            <p className="text-sm font-medium text-foreground">Signing you in…</p>
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
    </div>,
    document.body,
  )
}
