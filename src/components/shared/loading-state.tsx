import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { PageLoader, ProgressPulse } from '@/components/shared/loader'
import { cn } from '@/lib/utils'

export function LoadingState({
  rows = 4,
  message = 'Loading…',
  withSpinner = true,
}: {
  rows?: number
  message?: string
  withSpinner?: boolean
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      {withSpinner ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{message}</p>
          <ProgressPulse />
        </div>
      ) : null}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('h-14 w-full rounded-2xl', i === 0 && 'h-16')}
            style={{ animationDelay: `${i * 70}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

export function FullPageLoader({
  title,
  description,
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <PageLoader title={title} description={description} />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      <ProgressPulse className="max-w-xs" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-7 w-56 rounded-xl" />
        <Skeleton className="h-4 w-80 max-w-full rounded-lg" />
      </div>
      <div className="grid w-full max-w-xl grid-cols-2 gap-1.5 sm:max-w-2xl sm:grid-cols-3 lg:max-w-3xl lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="rounded-lg shadow-none">
            <CardContent className="space-y-1 px-2 py-1">
              <Skeleton className="h-2 w-14 rounded-full" />
              <Skeleton className="h-3 w-10 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        <Skeleton className="h-44 rounded-2xl xl:col-span-2" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    </div>
  )
}

export function TableSkeleton({
  rows = 5,
  message = 'Loading directory…',
}: {
  rows?: number
  message?: string
}) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{message}</p>
        <ProgressPulse />
      </div>
      <div className="space-y-2 rounded-2xl border border-border/60 p-4">
        <Skeleton className="mb-3 h-10 w-full rounded-xl" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-12 w-full rounded-xl"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
