import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { rateLimit } from '@/server/http/rate-limit'
import { roleMatrixUpdateSchema } from '@/server/validators/admin'
import {
  listRoleMatricesService,
  updateRoleMatrixService,
} from '@/server/services/admin-users-service'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await listRoleMatricesService(session))
})

export const PUT = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`roles:update:${session.uid}`, 20, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = roleMatrixUpdateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid role matrix', parsed.error.flatten())
  return jsonOk(await updateRoleMatrixService(session, parsed.data, requestId))
})
