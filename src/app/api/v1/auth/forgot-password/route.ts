import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { rateLimit } from '@/server/http/rate-limit'
import { emailSchema } from '@/server/validators/common'
import { clearTemporaryPasswordForEmailService } from '@/server/services/staff-service'
import { z } from 'zod'

const schema = z.object({
  email: emailSchema,
})

/**
 * After Firebase sends a password-reset email from the client, call this so the
 * admin login sheet no longer shows an old temporary password for that account.
 * Always returns ok (no email enumeration).
 */
export const POST = withApiHandler(async (request) => {
  const ip = request.headers.get('x-forwarded-for') ?? 'local'
  rateLimit(`forgot-password:${ip}`, 10, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw badRequest('Valid email is required')

  await clearTemporaryPasswordForEmailService(parsed.data.email).catch(() => undefined)
  return jsonOk({ sent: true })
})
