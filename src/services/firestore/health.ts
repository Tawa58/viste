import { collection, getDocs, limit, query } from 'firebase/firestore'
import { ensureFirebaseAuth, getFirestoreDb } from '@/services/firebase/app'

export type FirestoreHealth =
  | { ok: true }
  | { ok: false; code: string; message: string }

let cached: Promise<FirestoreHealth> | null = null

/**
 * Probes Firestore once. Used to show a setup banner when rules/auth block the app.
 */
export function checkFirestoreHealth(force = false): Promise<FirestoreHealth> {
  if (!cached || force) {
    cached = (async (): Promise<FirestoreHealth> => {
      try {
        await ensureFirebaseAuth()
        await getDocs(query(collection(getFirestoreDb(), 'subjects'), limit(1)))
        return { ok: true }
      } catch (err) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'unknown'
        const message = err instanceof Error ? err.message : 'Firestore unavailable'
        return { ok: false, code, message }
      }
    })()
  }
  return cached
}

export function isPermissionDenied(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === 'object' &&
      'code' in err &&
      String((err as { code: string }).code).includes('permission-denied'),
  )
}
