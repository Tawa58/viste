import { requireSession } from '@/server/auth/session'
import { jsonOk, routeParam, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { rateLimit } from '@/server/http/rate-limit'
import { userUpdateSchema } from '@/server/validators/admin'
import { updateUserService } from '@/server/services/admin-users-service'

export const PATCH = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = routeParam(await ctx.params, 'id')
  rateLimit(`users:update:${session.uid}`, 40, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = userUpdateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid user update', parsed.error.flatten())
  return jsonOk(await updateUserService(session, id, parsed.data, ctx.requestId))
})
