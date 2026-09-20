import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { staffCreateSchema } from '@/server/validators/school'
import {
  createStaffService,
  listStaffCredentialsService,
  listStaffService,
} from '@/server/services/staff-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  const url = new URL(request.url)
  if (url.searchParams.get('credentials') === '1') {
    return jsonOk(await listStaffCredentialsService(session))
  }
  return jsonOk(await listStaffService(session))
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`staff:create:${session.uid}`, 20, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = staffCreateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid staff payload', parsed.error.flatten())
  return jsonOk(await createStaffService(session, parsed.data, requestId), { status: 201 })
})
