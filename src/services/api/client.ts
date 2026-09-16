import { delay } from '@/lib/utils'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:18080/api/v1'

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'

export async function mockRequest<T>(data: T, ms = 350): Promise<T> {
  await delay(ms)
  return data
}

/**
 * Future Spring Boot integration point.
 * Components should depend on service interfaces, not fetch URLs.
 */
export function apiUrl(path: string) {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${clean}`
}
