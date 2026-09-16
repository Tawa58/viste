import { Link } from 'react-router-dom'
import { SchoolLogo } from '@/components/shared/school-logo'
import { cn } from '@/lib/utils'

export function BrandMark({
  compact = false,
  className,
  light = false,
}: {
  compact?: boolean
  className?: string
  light?: boolean
}) {
  return (
    <Link to="/dashboard" className={cn('flex items-center gap-3', className)}>
      <SchoolLogo size="md" className={cn(light && 'ring-1 ring-white/20')} />
      {!compact && (
        <div className="min-w-0">
          <div
            className={cn(
              'font-display text-base font-semibold leading-tight tracking-tight',
              light ? 'text-white' : 'text-foreground',
            )}
          >
            Viste High School
          </div>
          <div className={cn('text-xs', light ? 'text-white/70' : 'text-muted-foreground')}>
            Management System
          </div>
        </div>
      )}
    </Link>
  )
}
