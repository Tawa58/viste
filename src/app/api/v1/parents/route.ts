import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { guardianCreateSchema } from '@/server/validators/school'
import {
  createGuardianService,
  listGuardiansService,
} from '@/server/services/staff-service'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await listGuardiansService(session))
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  const body = await request.json().catch(() => null)
  const parsed = guardianCreateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid guardian payload', parsed.error.flatten())
  return jsonOk(await createGuardianService(session, parsed.data, requestId), { status: 201 })
})
