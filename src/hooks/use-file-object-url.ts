import { useEffect, useState } from 'react'
import { fileService, type FileAccessContext } from '@/services/files'

/**
 * Resolve a Firestore file id to a temporary object URL for <img>/Avatar.
 */
export function useFileObjectUrl(
  fileId: string | undefined | null,
  access: FileAccessContext | null,
) {
  const [url, setUrl] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let revoked = false
    let objectUrl: string | undefined

    async function run() {
      if (!fileId || !access) {
        setUrl(undefined)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        objectUrl = await fileService.getObjectUrl(fileId, access)
        if (!revoked) setUrl(objectUrl)
      } catch (err) {
        if (!revoked) {
          setUrl(undefined)
          setError(err instanceof Error ? err.message : 'Could not load file')
        }
      } finally {
        if (!revoked) setLoading(false)
      }
    }

    void run()
    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId, access?.userId, access?.role, access?.staffId, access?.studentId, access?.guardianId])

  return { url, loading, error }
}
