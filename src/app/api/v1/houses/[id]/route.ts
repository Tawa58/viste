import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { houseUpdateSchema } from '@/server/validators/school'
import { updateHouse } from '@/server/services/extracurricular-service'
import { rateLimit } from '@/server/http/rate-limit'

function paramId(id: string | string[] | undefined): string {
  const v = Array.isArray(id) ? id[0] : id
  if (!v) throw badRequest('Missing id')
  return v
}

export const PATCH = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = paramId((await ctx.params).id)
  rateLimit(`houses:update:${session.uid}`, 60, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = houseUpdateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid house update', parsed.error.flatten())
  return jsonOk(await updateHouse(session, id, parsed.data, ctx.requestId))
})
