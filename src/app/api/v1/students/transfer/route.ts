import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { transferStudentSchema } from '@/server/validators/school'
import { transferStudentService } from '@/server/services/students-service'
import { rateLimit } from '@/server/http/rate-limit'

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`students:transfer:${session.uid}`, 30, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = transferStudentSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid transfer payload', parsed.error.flatten())
  const data = await transferStudentService(session, parsed.data, requestId)
  return jsonOk(data, { status: 201 })
})
