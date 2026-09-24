import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler, routeParam } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { classTeacherReportsUpsertSchema } from '@/server/validators/school'
import {
  listClassTeacherReports,
  upsertClassTeacherReports,
} from '@/server/services/class-teacher-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request, { params }) => {
  const session = await requireSession(request)
  const classId = routeParam(await params, 'id')
  const termId = new URL(request.url).searchParams.get('termId')
  if (!termId) throw badRequest('termId is required')
  return jsonOk(await listClassTeacherReports(session, classId, termId))
})

export const PUT = withApiHandler(async (request, { params, requestId }) => {
  const session = await requireSession(request)
  rateLimit(`class-reports:${session.uid}`, 40, 60_000)
  const classId = routeParam(await params, 'id')
  const body = await request.json().catch(() => null)
  const parsed = classTeacherReportsUpsertSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid report payload', parsed.error.flatten())
  return jsonOk(await upsertClassTeacherReports(session, classId, parsed.data, requestId))
})
