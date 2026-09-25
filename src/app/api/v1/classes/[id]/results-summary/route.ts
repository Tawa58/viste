import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler, routeParam } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { getClassResultsSummary } from '@/server/services/class-teacher-service'

export const GET = withApiHandler(async (request, { params }) => {
  const session = await requireSession(request)
  const classId = routeParam(await params, 'id')
  const search = new URL(request.url).searchParams
  const period = search.get('period') === 'MONTH' ? 'MONTH' : 'TERM'
  const termId = search.get('termId') ?? undefined
  const month = search.get('month') ?? undefined
  if (period === 'MONTH' && !/^\d{4}-\d{2}$/.test(month ?? '')) {
    throw badRequest('month (YYYY-MM) is required')
  }
  if (period === 'TERM' && !termId) throw badRequest('termId is required')
  return jsonOk(await getClassResultsSummary(session, classId, { period, termId, month }))
})
