import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { attendanceUpsertSchema } from '@/server/validators/school'
import {
  listAttendanceService,
  upsertAttendanceService,
} from '@/server/services/catalog-service'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await listAttendanceService(session))
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  const body = await request.json().catch(() => null)
  const parsed = attendanceUpsertSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid attendance payload', parsed.error.flatten())
  return jsonOk(await upsertAttendanceService(session, parsed.data, requestId), { status: 201 })
})
