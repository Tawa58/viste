import 'server-only'

import type { SessionContext } from '@/server/auth/session'

type Entry<T> = { at: number; value: T }

const store = new Map<string, Entry<unknown>>()

export function remember<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const hit = store.get(key)
  if (hit && Date.now() - hit.at < ttlMs) {
    return Promise.resolve(hit.value as T)
  }
  return compute().then((value) => {
    store.set(key, { at: Date.now(), value })
    return value
  })
}

export function forget(prefix?: string) {
  if (!prefix) {
    store.clear()
    return
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

export function sessionCacheKey(session: SessionContext, suffix: string) {
  return `${session.uid}:${suffix}`
}
