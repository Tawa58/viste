import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { rateLimit } from '@/server/http/rate-limit'
import { authActivitySchema } from '@/server/validators/admin'
import { recordAuthActivityService } from '@/server/services/admin-users-service'

/** Records sign-in / sign-out in the school audit log. */
export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`auth-activity:${session.uid}`, 30, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = authActivitySchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid activity payload', parsed.error.flatten())
  return jsonOk(await recordAuthActivityService(session, parsed.data.event, requestId))
})
