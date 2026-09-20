import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { subjectCreateSchema } from '@/server/validators/school'
import {
  createSubject,
  listSubjects,
} from '@/server/services/extracurricular-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  const data = await listSubjects(session)
  return jsonOk(data)
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`subjects:create:${session.uid}`, 40, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = subjectCreateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid subject payload', parsed.error.flatten())
  const data = await createSubject(session, parsed.data, requestId)
  return jsonOk(data, { status: 201 })
})
