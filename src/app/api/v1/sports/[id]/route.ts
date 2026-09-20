import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { sportUpdateSchema } from '@/server/validators/school'
import { updateSport } from '@/server/services/extracurricular-service'
import { rateLimit } from '@/server/http/rate-limit'

function paramId(id: string | string[] | undefined): string {
  const v = Array.isArray(id) ? id[0] : id
  if (!v) throw badRequest('Missing id')
  return v
}

export const PATCH = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = paramId((await ctx.params).id)
  rateLimit(`sports:update:${session.uid}`, 60, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = sportUpdateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid sport update', parsed.error.flatten())
  return jsonOk(await updateSport(session, id, parsed.data, ctx.requestId))
})
