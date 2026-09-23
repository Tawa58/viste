import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { rateLimit } from '@/server/http/rate-limit'
import {
  transportPaymentCreateSchema,
  transportRiderCreateSchema,
  transportRouteCreateSchema,
  transportVehicleCreateSchema,
} from '@/server/validators/ops'
import {
  createTransportPaymentService,
  createTransportRiderService,
  createTransportRouteService,
  createTransportVehicleService,
  listTransportPaymentsService,
  listTransportRidersService,
  listTransportRoutesService,
  listTransportVehiclesService,
} from '@/server/services/transport-service'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  const kind = new URL(request.url).searchParams.get('kind') || 'routes'
  if (kind === 'vehicles') return jsonOk(await listTransportVehiclesService(session))
  if (kind === 'riders') return jsonOk(await listTransportRidersService(session))
  if (kind === 'payments') return jsonOk(await listTransportPaymentsService(session))
  return jsonOk(await listTransportRoutesService(session))
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`transport:create:${session.uid}`, 50, 60_000)
  const body = await request.json().catch(() => null)
  const kind = typeof body?.kind === 'string' ? body.kind : 'route'

  if (kind === 'vehicle') {
    const parsed = transportVehicleCreateSchema.safeParse(body)
    if (!parsed.success) throw badRequest('Invalid vehicle payload', parsed.error.flatten())
    return jsonOk(await createTransportVehicleService(session, parsed.data, requestId), {
      status: 201,
    })
  }
  if (kind === 'rider') {
    const parsed = transportRiderCreateSchema.safeParse(body)
    if (!parsed.success) throw badRequest('Invalid rider payload', parsed.error.flatten())
    return jsonOk(await createTransportRiderService(session, parsed.data, requestId), {
      status: 201,
    })
  }
  if (kind === 'payment') {
    const parsed = transportPaymentCreateSchema.safeParse(body)
    if (!parsed.success) throw badRequest('Invalid payment payload', parsed.error.flatten())
    return jsonOk(await createTransportPaymentService(session, parsed.data, requestId), {
      status: 201,
    })
  }

  const parsed = transportRouteCreateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid route payload', parsed.error.flatten())
  return jsonOk(await createTransportRouteService(session, parsed.data, requestId), {
    status: 201,
  })
})
