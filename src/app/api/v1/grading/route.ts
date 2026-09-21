import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { gradingScaleSchema } from '@/server/validators/school'
import {
  getGradingScaleService,
  updateGradingScaleService,
} from '@/server/services/grading-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await getGradingScaleService(session))
})

export const PUT = withApiHandler(async (request) => {
  const session = await requireSession(request)
  rateLimit(`settings:grading:${session.uid}`, 30, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = gradingScaleSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid grading scale', parsed.error.flatten())
  return jsonOk(await updateGradingScaleService(session, parsed.data))
})
