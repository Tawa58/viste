import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { getFirestoreDb } from '@/services/firebase/app'
import type { StoredFileChunk, StoredFileMetadata } from './types'

export interface FileRepository {
  saveFile(metadata: StoredFileMetadata, chunks: StoredFileChunk[]): Promise<void>
  getMetadata(fileId: string): Promise<StoredFileMetadata | undefined>
  getChunks(fileId: string): Promise<StoredFileChunk[]>
  listByOwner(ownerType: string, ownerId: string): Promise<StoredFileMetadata[]>
  softDelete(fileId: string): Promise<void>
  restore(fileId: string): Promise<void>
  updateSyncStatus(
    fileId: string,
    syncStatus: StoredFileMetadata['syncStatus'],
    lastError?: string,
  ): Promise<void>
}

function filesCol(db: Firestore) {
  return collection(db, 'files')
}

export class FirestoreFileRepository implements FileRepository {
  private readonly db: Firestore

  constructor(db: Firestore = getFirestoreDb()) {
    this.db = db
  }

  async saveFile(metadata: StoredFileMetadata, chunks: StoredFileChunk[]): Promise<void> {
    const fileRef = doc(this.db, 'files', metadata.id)
    const batch = writeBatch(this.db)
    batch.set(fileRef, {
      ...metadata,
      storageMethod: 'firestore',
    })
    for (const chunk of chunks) {
      const chunkRef = doc(this.db, 'files', metadata.id, 'chunks', chunk.id)
      batch.set(chunkRef, {
        index: chunk.index,
        byteLength: chunk.byteLength,
        dataBase64: chunk.dataBase64,
      })
    }
    await batch.commit()
  }

  async getMetadata(fileId: string): Promise<StoredFileMetadata | undefined> {
    const snap = await getDoc(doc(this.db, 'files', fileId))
    if (!snap.exists()) return undefined
    return snap.data() as StoredFileMetadata
  }

  async getChunks(fileId: string): Promise<StoredFileChunk[]> {
    const snap = await getDocs(collection(this.db, 'files', fileId, 'chunks'))
    return snap.docs
      .map((d) => {
        const data = d.data()
        return {
          id: d.id,
          index: Number(data.index ?? 0),
          byteLength: Number(data.byteLength ?? 0),
          dataBase64: String(data.dataBase64 ?? ''),
        } satisfies StoredFileChunk
      })
      .sort((a, b) => a.index - b.index)
  }

  async listByOwner(ownerType: string, ownerId: string): Promise<StoredFileMetadata[]> {
    const q = query(
      filesCol(this.db),
      where('ownerType', '==', ownerType),
      where('ownerId', '==', ownerId),
      where('status', '==', 'active'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => d.data() as StoredFileMetadata)
  }

  async softDelete(fileId: string): Promise<void> {
    await updateDoc(doc(this.db, 'files', fileId), {
      status: 'deleted',
      deletedAt: new Date().toISOString(),
      syncStatus: 'synced',
    })
  }

  async restore(fileId: string): Promise<void> {
    await updateDoc(doc(this.db, 'files', fileId), {
      status: 'active',
      deletedAt: null,
      syncStatus: 'synced',
    })
  }

  async updateSyncStatus(
    fileId: string,
    syncStatus: StoredFileMetadata['syncStatus'],
    lastError?: string,
  ): Promise<void> {
    await setDoc(
      doc(this.db, 'files', fileId),
      {
        syncStatus,
        ...(lastError !== undefined ? { lastError } : { lastError: null }),
      },
      { merge: true },
    )
  }
}
