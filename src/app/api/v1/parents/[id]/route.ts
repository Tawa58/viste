import { requireSession, requirePerm } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest, notFound } from '@/server/errors'
import { guardianUpdateSchema } from '@/server/validators/school'
import {
  deleteGuardianService,
  updateGuardianService,
} from '@/server/services/guardians-service'
import { getDoc } from '@/server/repositories/firestore-repo'
import type { Guardian } from '@/types'

function paramId(id: string | string[] | undefined): string {
  const v = Array.isArray(id) ? id[0] : id
  if (!v) throw badRequest('Missing id')
  return v
}

export const GET = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  requirePerm(session, 'parents.read')
  const id = paramId((await ctx.params).id)
  const g = await getDoc<Guardian>('guardians', id)
  if (!g) throw notFound('Guardian not found')
  return jsonOk(g)
})

export const PATCH = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = paramId((await ctx.params).id)
  const body = await request.json().catch(() => null)
  const parsed = guardianUpdateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid guardian patch', parsed.error.flatten())
  return jsonOk(await updateGuardianService(session, id, parsed.data, ctx.requestId))
})

export const DELETE = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = paramId((await ctx.params).id)
  return jsonOk(await deleteGuardianService(session, id, ctx.requestId))
})
