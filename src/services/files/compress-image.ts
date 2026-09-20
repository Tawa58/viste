export interface CompressedImage {
  blob: Blob
  mimeType: string
  fileName: string
  width: number
  height: number
}

/**
 * Resize + compress images for Firestore storage.
 * Prefers WebP when supported, otherwise JPEG.
 */
export async function compressImage(
  file: File | Blob,
  originalName: string,
  options?: { maxEdge?: number; quality?: number },
): Promise<CompressedImage> {
  const maxEdge = options?.maxEdge ?? 1024
  const quality = options?.quality ?? 0.82

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Could not process image')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const preferWebp = supportsWebp()
  const mimeType = preferWebp ? 'image/webp' : 'image/jpeg'
  const blob = await canvasToBlob(canvas, mimeType, quality)
  const base = originalName.replace(/\.[^.]+$/, '') || 'photo'
  const fileName = `${base}.${preferWebp ? 'webp' : 'jpg'}`

  return { blob, mimeType, fileName, width, height }
}

function supportsWebp(): boolean {
  try {
    const c = document.createElement('canvas')
    return c.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    return false
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Image compression failed'))
      },
      type,
      quality,
    )
  })
}
