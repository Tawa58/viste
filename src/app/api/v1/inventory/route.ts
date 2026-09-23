import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { rateLimit } from '@/server/http/rate-limit'
import { inventoryCreateSchema } from '@/server/validators/ops'
import {
  createInventoryItemService,
  listInventoryService,
} from '@/server/services/inventory-service'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  return jsonOk(await listInventoryService(session))
})

export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  rateLimit(`inventory:create:${session.uid}`, 40, 60_000)
  const body = await request.json().catch(() => null)
  const parsed = inventoryCreateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid inventory payload', parsed.error.flatten())
  return jsonOk(await createInventoryItemService(session, parsed.data, requestId), {
    status: 201,
  })
})
