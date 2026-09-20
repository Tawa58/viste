import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { sportCreateSchema } from '@/server/validators/school'
import { createSport, listSports } from '@/server/services/extracurricular-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await listSports(session))
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`sports:create:${session.uid}`, 40, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = sportCreateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid sport payload', parsed.error.flatten())
  return jsonOk(await createSport(session, parsed.data, requestId), { status: 201 })
})
