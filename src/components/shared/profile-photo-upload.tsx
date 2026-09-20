import { useId, useRef, useState } from 'react'
import { Camera, ImagePlus, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { FileSyncBadge } from '@/components/shared/file-sync-badge'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import {
  fileService,
  FileValidationError,
  type FileAccessContext,
  type FileCategory,
  type FileOwnerType,
  type FileSyncStatus,
} from '@/services/files'

const ACCEPT = 'image/jpeg,image/png,image/webp'

export function ProfilePhotoUpload({
  name,
  /** Local preview URL for immediate display. */
  previewUrl,
  fileId,
  onChange,
  access,
  ownerId,
  ownerType,
  fileType,
  disabled = false,
  size = 'lg',
  className,
  hint = 'JPG, PNG or WebP · compressed to Firestore (not Firebase Storage)',
}: {
  name: string
  previewUrl?: string | null
  fileId?: string | null
  /** Receives Firestore file id + preview. Large bytes are never stored on the school record. */
  onChange: (next: { fileId: string; previewUrl: string } | undefined) => void
  access: FileAccessContext
  ownerId: string
  ownerType: FileOwnerType
  fileType: Extract<FileCategory, 'profile_photo' | 'staff_photo'>
  disabled?: boolean
  size?: 'md' | 'lg'
  className?: string
  hint?: string
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [syncStatus, setSyncStatus] = useState<FileSyncStatus | null>(
    fileId ? 'synced' : null,
  )

  async function handleFile(file: File | undefined) {
    if (!file || disabled) return

    setBusy(true)
    try {
      const result = await notify.process(
        () =>
          fileService.uploadFile(
            {
              file,
              fileType,
              ownerId,
              ownerType,
              uploadedBy: access.userId,
              compressImage: true,
            },
            access,
          ),
        {
          loading: 'Uploading photo to Firestore…',
          success: 'Profile photo saved',
          error: 'Could not upload photo',
        },
      )
      setSyncStatus(result.metadata.syncStatus)
      onChange({
        fileId: result.metadata.id,
        previewUrl: result.previewUrl ?? URL.createObjectURL(file),
      })
      if (result.queuedOffline) {
        notify.info('Saved offline', 'Photo will sync to Firestore when you are back online.')
      }
    } catch (error) {
      if (error instanceof FileValidationError) {
        notify.error(error.message)
      }
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    if (fileId) {
      try {
        await fileService.deleteFile(fileId, access)
      } catch {
        // still clear local reference
      }
    }
    onChange(undefined)
    setSyncStatus(null)
    notify.success('Profile photo removed')
  }

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="relative shrink-0">
        <Avatar
          name={name}
          src={previewUrl}
          className={cn(size === 'lg' ? 'h-20 w-20 text-lg' : 'h-14 w-14 text-sm')}
        />
        <label
          htmlFor={inputId}
          className={cn(
            'absolute -bottom-1 -right-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-muted',
            (disabled || busy) && 'pointer-events-none opacity-60',
          )}
          title="Upload photo"
        >
          <Camera className="h-3.5 w-3.5" />
          <span className="sr-only">Upload profile photo</span>
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={disabled || busy}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium">Profile photo</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
        {syncStatus ? <FileSyncBadge status={syncStatus} /> : null}
        {fileId ? (
          <p className="truncate text-[11px] text-muted-foreground">Ref: {fileId}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={busy}
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {!busy ? <ImagePlus className="h-3.5 w-3.5" /> : null}
            {fileId || previewUrl ? 'Replace photo' : 'Upload photo'}
          </Button>
          {(fileId || previewUrl) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || busy}
              onClick={() => void handleRemove()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
