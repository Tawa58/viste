import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { classUpdateSchema } from '@/server/validators/school'
import {
  archiveClassService,
  getClassService,
  updateClassService,
} from '@/server/services/classes-service'
import { rateLimit } from '@/server/http/rate-limit'

function paramId(id: string | string[] | undefined): string {
  const v = Array.isArray(id) ? id[0] : id
  if (!v) throw badRequest('Missing id')
  return v
}

export const GET = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = paramId((await ctx.params).id)
  return jsonOk(await getClassService(session, id))
})

export const PATCH = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = paramId((await ctx.params).id)
  rateLimit(`classes:update:${session.uid}`, 60, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = classUpdateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid class update', parsed.error.flatten())
  return jsonOk(await updateClassService(session, id, parsed.data, ctx.requestId))
})

export const DELETE = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = paramId((await ctx.params).id)
  rateLimit(`classes:archive:${session.uid}`, 30, 60_000)
  return jsonOk(await archiveClassService(session, id, ctx.requestId))
})
