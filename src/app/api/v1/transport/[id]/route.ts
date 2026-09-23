import { requireSession } from '@/server/auth/session'
import { jsonOk, routeParam, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { rateLimit } from '@/server/http/rate-limit'
import {
  transportRiderUpdateSchema,
  transportRouteUpdateSchema,
  transportVehicleUpdateSchema,
} from '@/server/validators/ops'
import {
  deleteTransportRouteService,
  updateTransportRiderService,
  updateTransportRouteService,
  updateTransportVehicleService,
} from '@/server/services/transport-service'

export const PATCH = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = routeParam(await ctx.params, 'id')
  rateLimit(`transport:update:${session.uid}`, 60, 60_000)
  const body = await request.json().catch(() => null)
  const kind = typeof body?.kind === 'string' ? body.kind : 'route'

  if (kind === 'vehicle') {
    const parsed = transportVehicleUpdateSchema.safeParse(body)
    if (!parsed.success) throw badRequest('Invalid vehicle payload', parsed.error.flatten())
    return jsonOk(
      await updateTransportVehicleService(session, id, parsed.data, ctx.requestId),
    )
  }
  if (kind === 'rider') {
    const parsed = transportRiderUpdateSchema.safeParse(body)
    if (!parsed.success) throw badRequest('Invalid rider payload', parsed.error.flatten())
    return jsonOk(await updateTransportRiderService(session, id, parsed.data, ctx.requestId))
  }

  const parsed = transportRouteUpdateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid route payload', parsed.error.flatten())
  return jsonOk(await updateTransportRouteService(session, id, parsed.data, ctx.requestId))
})

export const DELETE = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = routeParam(await ctx.params, 'id')
  rateLimit(`transport:delete:${session.uid}`, 30, 60_000)
  await deleteTransportRouteService(session, id, ctx.requestId)
  return jsonOk({ ok: true })
})
