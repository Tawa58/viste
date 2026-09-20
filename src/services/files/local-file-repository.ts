import type { StoredFileChunk, StoredFileMetadata } from './types'
import type { FileRepository } from './firestore-file-repository'

const DB_NAME = 'viste-firestore-files'
const DB_VERSION = 1
const META_STORE = 'file_metadata'
const CHUNK_STORE = 'file_chunks'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(META_STORE)) {
        const store = db.createObjectStore(META_STORE, { keyPath: 'id' })
        store.createIndex('byOwner', ['ownerType', 'ownerId'], { unique: false })
        store.createIndex('byStatus', 'status', { unique: false })
      }
      if (!db.objectStoreNames.contains(CHUNK_STORE)) {
        const store = db.createObjectStore(CHUNK_STORE, { keyPath: ['fileId', 'id'] })
        store.createIndex('byFile', 'fileId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
}

function idbReq<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

type ChunkRow = StoredFileChunk & { fileId: string }

/**
 * Local cache / offline store for Firestore file metadata + chunks.
 * Used when offline and as a read-through cache. Not Firebase Storage.
 */
export class LocalFileRepository implements FileRepository {
  async saveFile(metadata: StoredFileMetadata, chunks: StoredFileChunk[]): Promise<void> {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([META_STORE, CHUNK_STORE], 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Local save failed'))
      tx.objectStore(META_STORE).put(metadata)
      const chunkStore = tx.objectStore(CHUNK_STORE)
      for (const chunk of chunks) {
        chunkStore.put({ ...chunk, fileId: metadata.id } satisfies ChunkRow)
      }
    })
  }

  async getMetadata(fileId: string): Promise<StoredFileMetadata | undefined> {
    const db = await openDb()
    return idbReq(db.transaction(META_STORE).objectStore(META_STORE).get(fileId))
  }

  async getChunks(fileId: string): Promise<StoredFileChunk[]> {
    const db = await openDb()
    const index = db.transaction(CHUNK_STORE).objectStore(CHUNK_STORE).index('byFile')
    const rows = await idbReq<ChunkRow[]>(index.getAll(fileId))
    return rows
      .map(({ id, index: i, dataBase64, byteLength }) => ({
        id,
        index: i,
        dataBase64,
        byteLength,
      }))
      .sort((a, b) => a.index - b.index)
  }

  async listByOwner(ownerType: string, ownerId: string): Promise<StoredFileMetadata[]> {
    const db = await openDb()
    const index = db.transaction(META_STORE).objectStore(META_STORE).index('byOwner')
    const rows = await idbReq<StoredFileMetadata[]>(index.getAll([ownerType, ownerId]))
    return rows.filter((r) => r.status === 'active')
  }

  async softDelete(fileId: string): Promise<void> {
    const meta = await this.getMetadata(fileId)
    if (!meta) return
    await this.saveFile(
      {
        ...meta,
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        syncStatus: meta.syncStatus === 'synced' ? 'synced' : 'pending',
      },
      await this.getChunks(fileId),
    )
  }

  async restore(fileId: string): Promise<void> {
    const meta = await this.getMetadata(fileId)
    if (!meta) return
    const { deletedAt: _removed, ...rest } = meta
    await this.saveFile(
      { ...rest, status: 'active', syncStatus: 'pending' },
      await this.getChunks(fileId),
    )
  }

  async updateSyncStatus(
    fileId: string,
    syncStatus: StoredFileMetadata['syncStatus'],
    lastError?: string,
  ): Promise<void> {
    const meta = await this.getMetadata(fileId)
    if (!meta) return
    await this.saveFile(
      { ...meta, syncStatus, lastError },
      await this.getChunks(fileId),
    )
  }
}

export const localFileRepository = new LocalFileRepository()
