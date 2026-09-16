import { cn } from '@/lib/utils'

export function Avatar({
  name,
  src,
  className,
}: {
  name: string
  src?: string | null
  className?: string
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          'inline-block h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border/70',
          className,
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary',
        className,
      )}
      aria-hidden
    >
      {initials}
    </div>
  )
}
