import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { classCreateSchema } from '@/server/validators/school'
import {
  createClassService,
  getStudentClassStatsService,
  listClassesService,
} from '@/server/services/classes-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  const url = new URL(request.url)
  if (url.searchParams.get('stats') === '1') {
    const data = await getStudentClassStatsService(session)
    return jsonOk(data)
  }
  const data = await listClassesService(session)
  return jsonOk(data)
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`classes:create:${session.uid}`, 40, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = classCreateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid class payload', parsed.error.flatten())
  const data = await createClassService(session, parsed.data, requestId)
  return jsonOk(data, { status: 201 })
})
