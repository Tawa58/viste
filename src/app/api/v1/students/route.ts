import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { studentCreateSchema } from '@/server/validators/school'
import {
  createStudentService,
  listStudentsService,
} from '@/server/services/students-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  const url = new URL(request.url)
  const classId = url.searchParams.get('classId')?.trim() || undefined
  const data = await listStudentsService(session, classId ? { classId } : undefined)
  return jsonOk(data)
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`students:create:${session.uid}`, 30, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = studentCreateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid student payload', parsed.error.flatten())
  const data = await createStudentService(session, parsed.data, requestId)
  return jsonOk(data, { status: 201 })
})
