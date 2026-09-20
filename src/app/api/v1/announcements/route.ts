import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { listAnnouncementsService } from '@/server/services/catalog-service'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await listAnnouncementsService(session))
})
