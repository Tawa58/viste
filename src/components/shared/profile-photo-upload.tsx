import { useId, useRef, useState } from 'react'
import { Camera, ImagePlus, Trash2 } from 'lucide-react'
import { ResolvedAvatar } from '@/components/shared/resolved-avatar'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useFileObjectUrl } from '@/hooks/use-file-object-url'
import {
  fileService,
  FileValidationError,
  type FileAccessContext,
  type FileCategory,
  type FileOwnerType,
} from '@/services/files'

const ACCEPT = 'image/jpeg,image/png,image/webp'

export function ProfilePhotoUpload({
  name,
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
  hint = '',
}: {
  name: string
  previewUrl?: string | null
  fileId?: string | null
  /** Receives file id + local preview for immediate display. */
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
  const [localPreview, setLocalPreview] = useState<string | undefined>()
  const stablePreview =
    previewUrl && !previewUrl.startsWith('blob:') && !previewUrl.startsWith('data:')
      ? previewUrl
      : undefined
  const { url: resolvedUrl } = useFileObjectUrl(
    localPreview || stablePreview ? null : fileId,
    access,
  )
  const displayUrl = localPreview || stablePreview || resolvedUrl || previewUrl || undefined

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
          loading: 'Saving photo…',
          success: 'Photo saved',
          error: 'Could not upload photo',
        },
      )
      const preview = result.previewUrl ?? URL.createObjectURL(file)
      setLocalPreview(preview)
      onChange({
        fileId: result.metadata.id,
        previewUrl: preview,
      })
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
    setLocalPreview(undefined)
    onChange(undefined)
    notify.success('Photo removed')
  }

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="relative shrink-0">
        <ResolvedAvatar
          name={name}
          src={displayUrl}
          fileId={null}
          access={access}
          className={cn(
            size === 'lg' ? 'h-20 w-20 text-lg' : 'h-14 w-14 text-sm',
            'ring-2 ring-background',
          )}
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
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
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
            {fileId || displayUrl ? 'Change photo' : 'Upload photo'}
          </Button>
          {(fileId || displayUrl) && (
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
