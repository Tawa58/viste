import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { paymentCreateSchema } from '@/server/validators/school'
import {
  createPaymentService,
  listPaymentsService,
} from '@/server/services/finance-service'
import { rateLimit } from '@/server/http/rate-limit'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await listPaymentsService(session))
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`payments:create:${session.uid}`, 40, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = paymentCreateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid payment payload', parsed.error.flatten())
  const data = await createPaymentService(session, parsed.data, requestId)
  return jsonOk(data, { status: 201 })
})
