import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { feePolicySchema } from '@/server/validators/school'
import {
  getFeePolicyService,
  updateFeePolicyService,
} from '@/server/services/school-settings-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await getFeePolicyService(session))
})

export const PUT = withApiHandler(async (request) => {
  const session = await requireSession(request)
  rateLimit(`settings:fees:${session.uid}`, 20, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = feePolicySchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid fee policy', parsed.error.flatten())
  return jsonOk(await updateFeePolicyService(session, parsed.data))
})
