import { useId, useRef, useState } from 'react'
import { Camera, ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

export function ProfilePhotoUpload({
  name,
  value,
  onChange,
  disabled = false,
  size = 'lg',
  className,
  hint = 'JPG, PNG or WebP · max 2 MB',
}: {
  name: string
  value?: string | null
  onChange: (photoUrl: string | undefined) => void
  disabled?: boolean
  size?: 'md' | 'lg'
  className?: string
  hint?: string
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file || disabled) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image must be 2 MB or smaller')
      return
    }

    setBusy(true)
    try {
      const dataUrl = await readAsDataUrl(file)
      onChange(dataUrl)
      toast.success('Profile photo updated')
    } catch {
      toast.error('Could not read that image')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="relative shrink-0">
        <Avatar
          name={name}
          src={value}
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
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {value ? 'Replace photo' : 'Upload photo'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || busy}
              onClick={() => {
                onChange(undefined)
                toast.success('Profile photo removed')
              }}
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

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Invalid file result'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'))
    reader.readAsDataURL(file)
  })
}
