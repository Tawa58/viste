import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { listStudentTransfersService } from '@/server/services/students-service'

function paramId(id: string | string[] | undefined): string {
  const v = Array.isArray(id) ? id[0] : id
  if (!v) throw badRequest('Missing id')
  return v
}

export const GET = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const studentId = paramId((await ctx.params).id)
  return jsonOk(await listStudentTransfersService(session, studentId))
})
