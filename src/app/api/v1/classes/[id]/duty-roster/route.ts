import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler, routeParam } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { dutyRosterUpsertSchema } from '@/server/validators/school'
import {
  getDutyRoster,
  upsertDutyRoster,
} from '@/server/services/class-teacher-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request, { params }) => {
  const session = await requireSession(request)
  const classId = routeParam(await params, 'id')
  const weekOf = new URL(request.url).searchParams.get('weekOf')
  if (!weekOf || !/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) {
    throw badRequest('weekOf (YYYY-MM-DD) is required')
  }
  return jsonOk(await getDutyRoster(session, classId, weekOf))
})

export const PUT = withApiHandler(async (request, { params, requestId }) => {
  const session = await requireSession(request)
  rateLimit(`duty-roster:${session.uid}`, 40, 60_000)
  const classId = routeParam(await params, 'id')
  const body = await request.json().catch(() => null)
  const parsed = dutyRosterUpsertSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid duty roster payload', parsed.error.flatten())
  return jsonOk(await upsertDutyRoster(session, classId, parsed.data, requestId))
})
