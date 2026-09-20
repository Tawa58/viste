import { cn } from '@/lib/utils'
import type { FileSyncStatus } from '@/services/files'

const LABELS: Record<FileSyncStatus, string> = {
  pending: 'Pending',
  uploading: 'Uploading',
  uploaded: 'Uploaded',
  syncing: 'Syncing',
  synced: 'Synced',
  failed: 'Failed',
}

export function FileSyncBadge({
  status,
  className,
  onRetry,
}: {
  status: FileSyncStatus
  className?: string
  onRetry?: () => void
}) {
  return (
    <div className={cn('inline-flex items-center gap-2 text-xs', className)}>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 font-semibold',
          status === 'synced' && 'bg-success/12 text-success',
          status === 'failed' && 'bg-destructive/12 text-destructive',
          status === 'pending' && 'bg-warning/12 text-warning',
          (status === 'uploading' || status === 'syncing' || status === 'uploaded') &&
            'bg-primary/10 text-primary',
        )}
      >
        {LABELS[status]}
      </span>
      {status === 'failed' && onRetry ? (
        <button type="button" className="font-semibold text-primary underline" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  )
}
