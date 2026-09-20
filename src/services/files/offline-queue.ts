import { ref, set } from 'firebase/database'
import { getRealtimeDb } from '@/services/firebase/app'
import type { FileSyncStatus, StoredFileChunk, StoredFileMetadata } from './types'
import { localFileRepository } from './local-file-repository'

const QUEUE_KEY = 'viste.pending.file.uploads'

export interface PendingFileJob {
  id: string
  metadata: StoredFileMetadata
  chunks: StoredFileChunk[]
  createdAt: string
  attempts: number
  lastError?: string
}

function readQueue(): PendingFileJob[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PendingFileJob[]
  } catch {
    return []
  }
}

function writeQueue(jobs: PendingFileJob[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(jobs))
}

export function enqueuePendingUpload(
  metadata: StoredFileMetadata,
  chunks: StoredFileChunk[],
): PendingFileJob {
  const job: PendingFileJob = {
    id: metadata.id,
    metadata,
    chunks,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  const queue = readQueue().filter((j) => j.id !== job.id)
  queue.push(job)
  writeQueue(queue)
  void localFileRepository.saveFile(metadata, chunks)
  void publishSyncStatus(metadata.id, 'pending')
  return job
}

export function listPendingUploads(): PendingFileJob[] {
  return readQueue()
}

export function removePendingUpload(fileId: string) {
  writeQueue(readQueue().filter((j) => j.id !== fileId))
}

export async function publishSyncStatus(fileId: string, status: FileSyncStatus, error?: string) {
  try {
    await set(ref(getRealtimeDb(), `syncStatus/files/${fileId}`), {
      status,
      error: error ?? null,
      updatedAt: Date.now(),
    })
  } catch {
    // RTDB may be unavailable offline — ignore.
  }
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

type FlushHandler = (job: PendingFileJob) => Promise<void>

let flushHandler: FlushHandler | null = null
let listening = false

export function registerOfflineFlushHandler(handler: FlushHandler) {
  flushHandler = handler
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('online', () => {
    void flushPendingUploads()
  })
}

export async function flushPendingUploads(): Promise<void> {
  if (!flushHandler || !isOnline()) return
  const queue = readQueue()
  for (const job of queue) {
    try {
      await publishSyncStatus(job.id, 'syncing')
      await flushHandler(job)
      removePendingUpload(job.id)
      await publishSyncStatus(job.id, 'synced')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed'
      const next = readQueue().map((j) =>
        j.id === job.id
          ? { ...j, attempts: j.attempts + 1, lastError: message }
          : j,
      )
      writeQueue(next)
      await publishSyncStatus(job.id, 'failed', message)
    }
  }
}

export async function retryPendingUpload(fileId: string): Promise<void> {
  const job = readQueue().find((j) => j.id === fileId)
  if (!job || !flushHandler) return
  await flushHandler(job)
  removePendingUpload(fileId)
  await publishSyncStatus(fileId, 'synced')
}
