import { SAFE_CHUNK_BYTES, type StoredFileChunk } from './types'

export function createFileId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `file_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`
  }
  return `file_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const buffer = await blob.arrayBuffer()
  return new Uint8Array(buffer)
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Split binary into Firestore-safe chunks. */
export function createFileChunks(bytes: Uint8Array, fileId: string): StoredFileChunk[] {
  const chunks: StoredFileChunk[] = []
  let index = 0
  for (let offset = 0; offset < bytes.length; offset += SAFE_CHUNK_BYTES) {
    const slice = bytes.subarray(offset, offset + SAFE_CHUNK_BYTES)
    const id = String(index + 1).padStart(4, '0')
    chunks.push({
      id,
      index,
      dataBase64: uint8ToBase64(slice),
      byteLength: slice.byteLength,
    })
    index += 1
  }
  if (chunks.length === 0) {
    chunks.push({
      id: '0001',
      index: 0,
      dataBase64: '',
      byteLength: 0,
    })
  }
  void fileId
  return chunks
}

export function reconstructBytes(chunks: StoredFileChunk[]): Uint8Array {
  const ordered = [...chunks].sort((a, b) => a.index - b.index)
  const total = ordered.reduce((sum, c) => sum + c.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of ordered) {
    const part = base64ToUint8(chunk.dataBase64)
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

export function reconstructBlob(chunks: StoredFileChunk[], mimeType: string): Blob {
  const bytes = reconstructBytes(chunks)
  // Copy into a plain ArrayBuffer-backed view for BlobPart compatibility.
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy.buffer], { type: mimeType })
}

export async function sha256Hex(bytes: Uint8Array): Promise<string | undefined> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return undefined
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
