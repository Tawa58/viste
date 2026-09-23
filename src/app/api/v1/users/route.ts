import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { rateLimit } from '@/server/http/rate-limit'
import { userCreateSchema } from '@/server/validators/admin'
import { createUserService, listUsersService } from '@/server/services/admin-users-service'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await listUsersService(session))
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`users:create:${session.uid}`, 20, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = userCreateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid user payload', parsed.error.flatten())
  return jsonOk(await createUserService(session, parsed.data, requestId), { status: 201 })
})
