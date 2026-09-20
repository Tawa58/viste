import { requireSession, sanitizeProfilePatch, omitUndefined } from '@/server/auth/session'
import { writeAuditLog } from '@/server/audit/logger'
import { getAdminDb } from '@/lib/firebase/admin'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { profileUpdateSchema } from '@/server/validators/school'
import { badRequest } from '@/server/errors'
import type { AuthUser } from '@/types'

export const PATCH = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  const body = await request.json().catch(() => null)
  const parsed = profileUpdateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid profile payload', parsed.error.flatten())

  const safe = sanitizeProfilePatch(parsed.data as Partial<AuthUser>)
  const ref = getAdminDb().collection('users').doc(session.uid)
  const next = omitUndefined({
    ...session.profile,
    ...safe,
    id: session.uid,
    role: session.profile.role,
  } as Record<string, unknown>) as unknown as AuthUser
  await ref.set(next, { merge: true })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'profile.update',
    entityType: 'users',
    entityId: session.uid,
    requestId,
  })
  return jsonOk({ user: next })
})
