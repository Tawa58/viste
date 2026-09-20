import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import {
  listAdminNotificationsService,
  markAllAdminNotificationsReadService,
  markNotificationReadService,
} from '@/server/services/notifications-service'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await listAdminNotificationsService(session))
})

export const PATCH = withApiHandler(async (request) => {
  const session = await requireSession(request)
  const body = (await request.json().catch(() => null)) as {
    id?: string
    markAllRead?: boolean
  } | null

  if (body?.markAllRead) {
    const count = await markAllAdminNotificationsReadService(session)
    return jsonOk({ marked: count })
  }

  if (!body?.id || typeof body.id !== 'string') {
    throw badRequest('Provide notification id or markAllRead')
  }

  const row = await markNotificationReadService(session, body.id)
  return jsonOk(row)
})
