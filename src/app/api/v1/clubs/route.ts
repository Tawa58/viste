import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { clubCreateSchema } from '@/server/validators/school'
import { createClub, listClubs } from '@/server/services/extracurricular-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await listClubs(session))
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`clubs:create:${session.uid}`, 40, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = clubCreateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid club payload', parsed.error.flatten())
  return jsonOk(await createClub(session, parsed.data, requestId), { status: 201 })
})
