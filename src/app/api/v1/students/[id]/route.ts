import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { studentUpdateSchema } from '@/server/validators/school'
import {
  archiveStudentService,
  deleteStudentService,
  getStudentService,
  updateStudentService,
} from '@/server/services/students-service'

function paramId(id: string | string[] | undefined): string {
  const v = Array.isArray(id) ? id[0] : id
  if (!v) throw badRequest('Missing id')
  return v
}

export const GET = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = paramId((await ctx.params).id)
  return jsonOk(await getStudentService(session, id))
})

export const PATCH = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = paramId((await ctx.params).id)
  const body = await request.json().catch(() => null)
  const parsed = studentUpdateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid student patch', parsed.error.flatten())
  return jsonOk(await updateStudentService(session, id, parsed.data, ctx.requestId))
})

export const DELETE = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = paramId((await ctx.params).id)
  const url = new URL(request.url)
  const mode = url.searchParams.get('mode')
  if (mode === 'archive') {
    return jsonOk(await archiveStudentService(session, id, ctx.requestId))
  }
  return jsonOk(await deleteStudentService(session, id, ctx.requestId))
})
