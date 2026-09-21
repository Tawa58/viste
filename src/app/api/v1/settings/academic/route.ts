import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { academicSettingsSchema } from '@/server/validators/school'
import {
  getAcademicSettingsService,
  updateAcademicSettingsService,
} from '@/server/services/academic-calendar-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await getAcademicSettingsService(session))
})

export const PUT = withApiHandler(async (request) => {
  const session = await requireSession(request)
  rateLimit(`settings:academic:${session.uid}`, 20, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = academicSettingsSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid academic settings', parsed.error.flatten())
  return jsonOk(await updateAcademicSettingsService(session, parsed.data))
})
