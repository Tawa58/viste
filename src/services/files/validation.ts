import type { FileCategory } from './types'
import { MAX_FILE_BYTES } from './types'

const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'com',
  'msi',
  'scr',
  'ps1',
  'sh',
  'bash',
  'dll',
  'jar',
  'vbs',
  'js',
  'mjs',
  'cjs',
  'apk',
  'dmg',
  'pkg',
  'reg',
])

const BLOCKED_MIME = new Set([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'application/x-bat',
  'application/javascript',
  'text/javascript',
  'application/java-archive',
])

const ALLOWED_BY_CATEGORY: Record<
  FileCategory,
  { extensions: string[]; mimeTypes: string[] }
> = {
  profile_photo: {
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  staff_photo: {
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  school_document: {
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/png',
      'image/jpeg',
    ],
  },
  report_pdf: {
    extensions: ['pdf'],
    mimeTypes: ['application/pdf'],
  },
  certificate: {
    extensions: ['pdf', 'jpg', 'jpeg', 'png'],
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  attachment: {
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'webp', 'txt'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'image/webp',
      'text/plain',
    ],
  },
  other: {
    extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt'],
    mimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain'],
  },
}

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileValidationError'
  }
}

export function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.')
  return parts.length > 1 ? (parts.at(-1) ?? '') : ''
}

export function validateFile(
  file: File | Blob,
  fileType: FileCategory,
  fileName?: string,
): { fileName: string; mimeType: string; extension: string } {
  const name =
    fileName ||
    (file instanceof File && file.name ? file.name : `upload.${guessExt(file.type, fileType)}`)
  const extension = getExtension(name)
  const mimeType = file.type || guessMime(extension, fileType)

  if (!extension) {
    throw new FileValidationError('File must include an extension.')
  }
  if (BLOCKED_EXTENSIONS.has(extension)) {
    throw new FileValidationError(`Executable or script files (.${extension}) are not allowed.`)
  }
  if (BLOCKED_MIME.has(mimeType)) {
    throw new FileValidationError(`MIME type "${mimeType}" is not allowed.`)
  }

  const allowed = ALLOWED_BY_CATEGORY[fileType]
  if (!allowed.extensions.includes(extension)) {
    throw new FileValidationError(
      `".${extension}" is not allowed for ${fileType}. Allowed: ${allowed.extensions.join(', ')}`,
    )
  }
  if (mimeType && !allowed.mimeTypes.includes(mimeType)) {
    throw new FileValidationError(
      `"${mimeType}" is not allowed for ${fileType}. Allowed: ${allowed.mimeTypes.join(', ')}`,
    )
  }

  const max = MAX_FILE_BYTES[fileType]
  if (file.size > max) {
    throw new FileValidationError(
      `File is too large (${formatMb(file.size)}). Max for ${fileType} is ${formatMb(max)}.`,
    )
  }
  if (file.size <= 0) {
    throw new FileValidationError('File is empty.')
  }

  return { fileName: name, mimeType, extension }
}

function formatMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function guessExt(mime: string, category: FileCategory): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'application/pdf') return 'pdf'
  if (category === 'profile_photo' || category === 'staff_photo') return 'jpg'
  return 'bin'
}

function guessMime(extension: string, category: FileCategory): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    pdf: 'application/pdf',
    txt: 'text/plain',
  }
  return map[extension] ?? (category.includes('photo') ? 'image/jpeg' : 'application/octet-stream')
}
