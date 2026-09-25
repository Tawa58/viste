import { z } from 'zod'
import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { rateLimit } from '@/server/http/rate-limit'
import { idSchema } from '@/server/validators/common'
import { issuePortalCodesForClass } from '@/server/services/student-portal-service'

export const maxDuration = 60

const schema = z.object({ classId: idSchema })

/** Issue this month's portal codes for all fee-cleared students in a class. */
export const POST = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  rateLimit(`portal-code:class:${session.uid}`, 10, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid class', parsed.error.flatten())
  return jsonOk(await issuePortalCodesForClass(session, parsed.data.classId, ctx.requestId))
})
