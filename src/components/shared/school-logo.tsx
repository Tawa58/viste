import { cn } from '@/lib/utils'

const sizeClass = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const

export function SchoolLogo({
  size = 'md',
  className,
}: {
  size?: keyof typeof sizeClass
  className?: string
}) {
  return (
    <img
      src="/viste-logo.png"
      alt=""
      aria-hidden
      className={cn('shrink-0 rounded-md object-cover', sizeClass[size], className)}
    />
  )
}
