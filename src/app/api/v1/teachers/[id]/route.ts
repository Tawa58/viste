import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler, routeParam } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { staffUpdateSchema } from '@/server/validators/school'
import {
  deleteStaffService,
  getStaff,
  updateStaffService,
} from '@/server/services/staff-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request, { params }) => {
  const session = await requireSession(request)
  const id = routeParam(await params, 'id')
  return jsonOk(await getStaff(session, id))
})

export const PATCH = withApiHandler(async (request, { params, requestId }) => {
  const session = await requireSession(request)
  rateLimit(`staff:update:${session.uid}`, 40, 60_000)
  const id = routeParam(await params, 'id')
  const body = await request.json().catch(() => null)
  const parsed = staffUpdateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid staff update', parsed.error.flatten())
  return jsonOk(await updateStaffService(session, id, parsed.data, requestId))
})

export const DELETE = withApiHandler(async (request, { params, requestId }) => {
  const session = await requireSession(request)
  rateLimit(`staff:delete:${session.uid}`, 20, 60_000)
  const id = routeParam(await params, 'id')
  return jsonOk(await deleteStaffService(session, id, requestId))
})
