import { cn } from '@/lib/utils'

/**
 * Pre-login welcome splash: rotating ring around the full school crest,
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
        'flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-6',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="relative flex h-52 w-52 items-center justify-center sm:h-60 sm:w-60">
        {/* Outer rotating ring */}
        <div
          className="welcome-splash-ring absolute inset-0 rounded-full border-[3px] border-transparent border-t-accent border-r-accent/40"
          aria-hidden
        />
        {/* White disc keeps the crest legible in dark mode */}
        <div
          className="absolute inset-2.5 rounded-full border border-border/60 bg-white shadow-sm"
          aria-hidden
        />
        {/* Crest is square with text at the edges — keep it inside the circle, uncropped. */}
        <img
          src="/viste-logo.png"
          alt="Viste Senior Academy"
          className="relative z-10 h-[8.5rem] w-[8.5rem] object-contain sm:h-40 sm:w-40"
        />
      </div>

      <p className="max-w-sm text-center text-base font-medium tracking-wide text-black dark:text-black">
        {message}
      </p>
    </div>
  )
}
