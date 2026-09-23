import { requireSession } from '@/server/auth/session'
import { jsonOk, routeParam, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { rateLimit } from '@/server/http/rate-limit'
import { inventoryUpdateSchema } from '@/server/validators/ops'
import {
  deleteInventoryItemService,
  updateInventoryItemService,
} from '@/server/services/inventory-service'

export const PATCH = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = routeParam(await ctx.params, 'id')
  rateLimit(`inventory:update:${session.uid}`, 60, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = inventoryUpdateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid inventory payload', parsed.error.flatten())
  return jsonOk(await updateInventoryItemService(session, id, parsed.data, ctx.requestId))
})

export const DELETE = withApiHandler(async (request, ctx) => {
  const session = await requireSession(request)
  const id = routeParam(await ctx.params, 'id')
  rateLimit(`inventory:delete:${session.uid}`, 30, 60_000)
  await deleteInventoryItemService(session, id, ctx.requestId)
  return jsonOk({ ok: true })
})
