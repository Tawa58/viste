import { SchoolLogo } from '@/components/shared/school-logo'
import { cn } from '@/lib/utils'

/**
 * Pre-login welcome splash: rotating ring with school logo inside,
 * and black “Welcome please wait……” text below.
 */
export function WelcomeSplash({
  className,
  message = 'Welcome please wait ..........',
}: {
  className?: string
  message?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="relative flex h-36 w-36 items-center justify-center sm:h-40 sm:w-40">
        {/* Outer rotating ring */}
        <div
          className="welcome-splash-ring absolute inset-0 rounded-full border-[3px] border-transparent border-t-accent border-r-accent/40"
          aria-hidden
        />
        {/* Soft inner halo */}
        <div
          className="absolute inset-3 rounded-full border border-border/60 bg-card/80 shadow-sm"
          aria-hidden
        />
        <SchoolLogo
          size="lg"
          className="relative z-10 h-20 w-20 rounded-full object-cover sm:h-24 sm:w-24"
        />
      </div>

      <p className="max-w-sm text-center text-base font-medium tracking-wide text-black dark:text-black">
        {message}
      </p>
    </div>
  )
}
