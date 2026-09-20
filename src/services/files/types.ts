export type FileCategory =
  | 'profile_photo'
  | 'staff_photo'
  | 'school_document'
  | 'report_pdf'
  | 'certificate'
  | 'attachment'
  | 'other'

export type FileOwnerType = 'student' | 'staff' | 'user' | 'school' | 'class' | 'report'

export type FileRecordStatus = 'active' | 'deleted' | 'pending_upload' | 'failed'

export type FileSyncStatus =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'syncing'
  | 'synced'
  | 'failed'

export type StorageMethod = 'firestore'

export interface StoredFileMetadata {
  id: string
  fileName: string
  originalFileName: string
  mimeType: string
  fileType: FileCategory
  sizeBytes: number
  storageMethod: StorageMethod
  ownerId: string
  ownerType: FileOwnerType
  uploadedBy: string
  uploadedAt: string
  status: FileRecordStatus
  chunkCount: number
  syncStatus: FileSyncStatus
  /** Optional content hash for integrity checks. */
  contentHash?: string
  width?: number
  height?: number
  deletedAt?: string
  lastError?: string
}

export interface StoredFileChunk {
  id: string
  index: number
  /** Base64 payload (no data-URL prefix). Kept under Firestore 1 MiB limit. */
  dataBase64: string
  byteLength: number
}

export interface UploadFileInput {
  file: File | Blob
  fileName?: string
  fileType: FileCategory
  ownerId: string
  ownerType: FileOwnerType
  uploadedBy: string
  /** When true (default for photos), resize/compress before store. */
  compressImage?: boolean
}

export interface UploadFileResult {
  metadata: StoredFileMetadata
  /** Local object URL for immediate UI preview (revoke when done). */
  previewUrl?: string
  queuedOffline: boolean
}

export interface FileAccessContext {
  userId: string
  role: string
  staffId?: string
  studentId?: string
  guardianId?: string
  /** Student IDs this parent/guardian may access. */
  linkedStudentIds?: string[]
  /** Class IDs this teacher may access. */
  assignedClassIds?: string[]
}

/** Safe chunk payload size (~700 KiB) — well under Firestore ~1 MiB doc limit. */
export const SAFE_CHUNK_BYTES = 700_000

export const MAX_FILE_BYTES: Record<FileCategory, number> = {
  profile_photo: 5 * 1024 * 1024,
  staff_photo: 5 * 1024 * 1024,
  school_document: 15 * 1024 * 1024,
  report_pdf: 20 * 1024 * 1024,
  certificate: 10 * 1024 * 1024,
  attachment: 15 * 1024 * 1024,
  other: 10 * 1024 * 1024,
}
