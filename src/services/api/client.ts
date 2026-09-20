import { delay } from '@/lib/utils'
import { readPublicEnv } from '@/lib/env'

/** Mock mode only when explicitly enabled. Default: live Firebase. */
export const USE_MOCK_API = readPublicEnv('USE_MOCK_API', 'false') === 'true'

export async function mockRequest<T>(data: T, ms = 350): Promise<T> {
  await delay(ms)
  return data
}
