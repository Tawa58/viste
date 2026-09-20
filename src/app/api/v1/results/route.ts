import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { markUpsertSchema, resultTransitionSchema } from '@/server/validators/school'
import {
  getResultPortalService,
  listAssessmentsService,
  listMarksService,
  transitionAssessmentService,
  upsertMarkService,
} from '@/server/services/results-service'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  const url = new URL(request.url)
  const studentId = url.searchParams.get('studentId')
  if (studentId) {
    return jsonOk(await getResultPortalService(session, studentId))
  }
  const kind = url.searchParams.get('kind')
  if (kind === 'assessments') return jsonOk(await listAssessmentsService(session))
  if (kind === 'marks') return jsonOk(await listMarksService(session))
  return jsonOk(await listAssessmentsService(session))
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  const body = await request.json().catch(() => null)
  const parsed = markUpsertSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid mark payload', parsed.error.flatten())
  return jsonOk(await upsertMarkService(session, parsed.data, requestId), { status: 201 })
})

export const PATCH = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  const body = await request.json().catch(() => null)
  const parsed = resultTransitionSchema
    .safeParse(body?.status ? body : null)
  const assessmentId = typeof body?.assessmentId === 'string' ? body.assessmentId : ''
  if (!parsed.success || !assessmentId) {
    throw badRequest('Invalid transition payload')
  }
  return jsonOk(
    await transitionAssessmentService(session, assessmentId, parsed.data.status, requestId),
  )
})
