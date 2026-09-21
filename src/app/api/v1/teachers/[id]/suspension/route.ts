import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler, routeParam } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { staffSuspendSchema } from '@/server/validators/school'
import {
  reactivateStaffService,
  suspendStaffService,
} from '@/server/services/staff-service'
import { rateLimit } from '@/server/http/rate-limit'

/** Suspend / inactivate a teacher (admin only). */
export const POST = withApiHandler(async (request, { params, requestId }) => {
  const session = await requireSession(request)
  rateLimit(`staff:suspend:${session.uid}`, 20, 60_000)
  const id = routeParam(await params, 'id')
  const body = await request.json().catch(() => null)
  const parsed = staffSuspendSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid suspension payload', parsed.error.flatten())
  return jsonOk(await suspendStaffService(session, id, parsed.data, requestId))
})

/** Reactivate a suspended teacher (admin only). */
export const DELETE = withApiHandler(async (request, { params, requestId }) => {
  const session = await requireSession(request)
  rateLimit(`staff:reactivate:${session.uid}`, 20, 60_000)
  const id = routeParam(await params, 'id')
  return jsonOk(await reactivateStaffService(session, id, requestId))
})
