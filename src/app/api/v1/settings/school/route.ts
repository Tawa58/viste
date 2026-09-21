import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { schoolProfileSchema } from '@/server/validators/school'
import {
  getSchoolProfileService,
  updateSchoolProfileService,
} from '@/server/services/school-settings-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await getSchoolProfileService(session))
})

export const PUT = withApiHandler(async (request) => {
  const session = await requireSession(request)
  rateLimit(`settings:school:${session.uid}`, 20, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = schoolProfileSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid school profile', parsed.error.flatten())
  return jsonOk(await updateSchoolProfileService(session, parsed.data))
})
