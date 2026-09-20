import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { reversePaymentService } from '@/server/services/finance-service'
import { rateLimit } from '@/server/http/rate-limit'

export const POST = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  rateLimit(`payments:reverse:${session.uid}`, 20, 60_000)
  const id = (await ctx.params).id
  return jsonOk(await reversePaymentService(session, id, ctx.requestId))
})
