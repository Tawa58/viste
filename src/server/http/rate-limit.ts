import 'server-only'

import { tooManyRequests } from '@/server/errors'

/** Sliding-window timestamps per key (in-memory; per server instance). */
const windows = new Map<string, number[]>()

/**
 * Sliding-window rate limiter for sensitive routes.
 * Throws 429 AppError when `limit` requests occur within `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now()
  const cutoff = now - windowMs
  const prev = windows.get(key) ?? []
  const recent = prev.filter((t) => t > cutoff)

  if (recent.length >= limit) {
    windows.set(key, recent)
    throw tooManyRequests()
  }

  recent.push(now)
  windows.set(key, recent)

  // Opportunistic cleanup to bound memory
  if (windows.size > 10_000) {
    for (const [k, stamps] of windows) {
      const kept = stamps.filter((t) => t > cutoff)
      if (kept.length === 0) windows.delete(k)
      else windows.set(k, kept)
    }
  }
}
