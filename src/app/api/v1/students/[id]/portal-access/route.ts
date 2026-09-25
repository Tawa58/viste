import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { rateLimit } from '@/server/http/rate-limit'
import {
  getStudentPortalAccess,
  issueStudentPortalCode,
  revokeStudentPortalAccess,
} from '@/server/services/student-portal-service'

function paramId(id: string | string[] | undefined): string {
  const v = Array.isArray(id) ? id[0] : id
  if (!v) throw badRequest('Missing id')
  return v
}

export const GET = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const studentId = paramId((await ctx.params).id)
  return jsonOk(await getStudentPortalAccess(session, studentId))
})

/** Issue (or regenerate) this month's portal code. */
export const POST = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  rateLimit(`portal-code:issue:${session.uid}`, 60, 60_000)
  const studentId = paramId((await ctx.params).id)
  return jsonOk(await issueStudentPortalCode(session, studentId, ctx.requestId))
})

export const DELETE = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  rateLimit(`portal-code:revoke:${session.uid}`, 60, 60_000)
  const studentId = paramId((await ctx.params).id)
  return jsonOk(await revokeStudentPortalAccess(session, studentId, ctx.requestId))
})
