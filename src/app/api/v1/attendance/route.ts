import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import {
  attendanceRegisterSchema,
  attendanceUpsertSchema,
} from '@/server/validators/school'
import {
  listAttendanceSessionsService,
  listAttendanceService,
  submitDailyRegisterService,
  upsertAttendanceService,
} from '@/server/services/attendance-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  const url = new URL(request.url)
  const date = url.searchParams.get('date') ?? undefined
  const classId = url.searchParams.get('classId') ?? undefined
  const studentId = url.searchParams.get('studentId') ?? undefined
  const kindParam = url.searchParams.get('kind')
  const kind =
    kindParam === 'DAILY' || kindParam === 'PERIOD' ? kindParam : undefined

  if (url.searchParams.get('sessions') === '1') {
    return jsonOk(await listAttendanceSessionsService(session, { date, classId }))
  }

  return jsonOk(await listAttendanceService(session, { date, classId, studentId, kind }))
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`attendance:write:${session.uid}`, 60, 60_000)
  const body = await request.json().catch(() => null)

  // Daily class register batch submit
  if (body && typeof body === 'object' && Array.isArray((body as { entries?: unknown }).entries)) {
    const parsed = attendanceRegisterSchema.safeParse(body)
    if (!parsed.success) {
      throw badRequest('Invalid daily register payload', parsed.error.flatten())
    }
    return jsonOk(await submitDailyRegisterService(session, parsed.data, requestId), {
      status: 201,
    })
  }

  const parsed = attendanceUpsertSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid attendance payload', parsed.error.flatten())
  return jsonOk(await upsertAttendanceService(session, parsed.data, requestId), { status: 201 })
})
