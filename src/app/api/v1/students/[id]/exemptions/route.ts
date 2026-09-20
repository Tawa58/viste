import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { exemptionCreateSchema } from '@/server/validators/school'
import {
  createExemptionService,
  deactivateExemptionService,
  listStudentExemptionsService,
} from '@/server/services/students-service'
import { rateLimit } from '@/server/http/rate-limit'

function paramId(id: string | string[] | undefined): string {
  const v = Array.isArray(id) ? id[0] : id
  if (!v) throw badRequest('Missing id')
  return v
}

export const GET = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const studentId = paramId((await ctx.params).id)
  return jsonOk(await listStudentExemptionsService(session, studentId))
})

export const POST = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  rateLimit(`exemptions:create:${session.uid}`, 30, 60_000)
  const studentId = paramId((await ctx.params).id)
  const body = await request.json().catch(() => null)
  const parsed = exemptionCreateSchema.safeParse({ ...body, studentId })
  if (!parsed.success) throw badRequest('Invalid exemption payload', parsed.error.flatten())
  return jsonOk(await createExemptionService(session, parsed.data, ctx.requestId), {
    status: 201,
  })
})

export const PATCH = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  rateLimit(`exemptions:update:${session.uid}`, 40, 60_000)
  const body = await request.json().catch(() => null)
  const exemptionId = typeof body?.id === 'string' ? body.id : null
  if (!exemptionId) throw badRequest('Missing exemption id')
  // Ensure route student id is present (authorization via exemption lookup)
  paramId((await ctx.params).id)
  return jsonOk(await deactivateExemptionService(session, exemptionId, ctx.requestId))
})
