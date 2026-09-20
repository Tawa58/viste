import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { z } from 'zod'
import { resetStaffPasswordService } from '@/server/services/staff-service'
import { rateLimit } from '@/server/http/rate-limit'

const bodySchema = z.object({ password: z.string().min(8).max(128) })

function paramId(id: string | string[] | undefined): string {
  const v = Array.isArray(id) ? id[0] : id
  if (!v) throw badRequest('Missing id')
  return v
}

export const POST = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  rateLimit(`staff:reset:${session.uid}`, 10, 60_000)
  const id = paramId((await ctx.params).id)
  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid password payload', parsed.error.flatten())
  return jsonOk(await resetStaffPasswordService(session, id, parsed.data.password, ctx.requestId))
})
