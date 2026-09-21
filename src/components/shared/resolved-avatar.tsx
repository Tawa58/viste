import { Avatar } from '@/components/ui/avatar'
import { useFileObjectUrl } from '@/hooks/use-file-object-url'
import type { FileAccessContext } from '@/services/files'

/**
 * Avatar that shows a direct URL when present, otherwise loads from a Firestore file id.
 */
export function ResolvedAvatar({
  name,
  src,
  fileId,
  access,
  className,
}: {
  name: string
  src?: string | null
  fileId?: string | null
  access?: FileAccessContext | null
  className?: string
}) {
  const stableSrc =
    src && !src.startsWith('blob:') && !src.startsWith('data:') ? src : undefined
  const needsResolve = !stableSrc && Boolean(fileId)
  const { url } = useFileObjectUrl(needsResolve ? fileId : null, access ?? null)
  return (
    <Avatar
      name={name}
      src={stableSrc || url || (!stableSrc ? src : undefined)}
      className={className}
    />
  )
}
