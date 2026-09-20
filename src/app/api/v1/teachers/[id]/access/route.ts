import { z } from 'zod'
import { requireSession } from '@/server/auth/session'
import { badRequest } from '@/server/errors'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { rateLimit } from '@/server/http/rate-limit'
import {
  getStaffAccessService,
  updateStaffAccessService,
} from '@/server/services/staff-service'

const bodySchema = z.object({
  permissions: z.array(z.string().min(1).max(80)).max(80),
})

function paramId(id: string | string[] | undefined): string {
  const v = Array.isArray(id) ? id[0] : id
  if (!v) throw badRequest('Missing id')
  return v
}

export const GET = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = paramId((await ctx.params).id)
  return jsonOk(await getStaffAccessService(session, id))
})

export const PUT = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  rateLimit(`staff:access:${session.uid}`, 30, 60_000)
  const id = paramId((await ctx.params).id)
  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid access payload', parsed.error.flatten())
  return jsonOk(
    await updateStaffAccessService(session, id, parsed.data.permissions, ctx.requestId),
  )
})
