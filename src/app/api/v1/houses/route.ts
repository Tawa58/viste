import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { houseCreateSchema } from '@/server/validators/school'
import { createHouse, listHouses } from '@/server/services/extracurricular-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await listHouses(session))
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`houses:create:${session.uid}`, 40, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = houseCreateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid house payload', parsed.error.flatten())
  return jsonOk(await createHouse(session, parsed.data, requestId), { status: 201 })
})
