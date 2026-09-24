import { requireSession, sanitizeProfilePatch, omitUndefined } from '@/server/auth/session'
import { writeAuditLog } from '@/server/audit/logger'
import { getAdminDb } from '@/lib/firebase/admin'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { profileUpdateSchema } from '@/server/validators/school'
import { badRequest } from '@/server/errors'
import type { AuthUser, Staff } from '@/types'

export const PATCH = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  const body = await request.json().catch(() => null)
  const parsed = profileUpdateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('Invalid profile payload', parsed.error.flatten())

  const safe = sanitizeProfilePatch(parsed.data as Partial<AuthUser>, {
    role: session.role,
  })
  // Never persist ephemeral browser blob/data URLs — only durable file ids.
  if (
    typeof safe.avatarUrl === 'string' &&
    (safe.avatarUrl.startsWith('blob:') || safe.avatarUrl.startsWith('data:'))
  ) {
    delete safe.avatarUrl
  }

  const ref = getAdminDb().collection('users').doc(session.uid)
  const next = omitUndefined({
    ...session.profile,
    ...safe,
    id: session.uid,
    role: session.profile.role,
  } as Record<string, unknown>) as unknown as AuthUser

  if (
    Object.prototype.hasOwnProperty.call(parsed.data, 'avatarFileId') &&
    parsed.data.avatarFileId === null
  ) {
    delete next.avatarFileId
    delete next.avatarUrl
  }

  await ref.set(next, { merge: true })

  // Keep staff directory photo in sync when a linked teacher updates their own picture.
  const staffId = session.profile.staffId
  if (staffId && Object.prototype.hasOwnProperty.call(parsed.data, 'avatarFileId')) {
    const staffRef = getAdminDb().collection('staff').doc(staffId)
    const staffSnap = await staffRef.get()
    if (staffSnap.exists) {
      const staff = staffSnap.data() as Staff
      if (parsed.data.avatarFileId) {
        await staffRef.set(
          { ...staff, id: staffId, profilePhotoId: parsed.data.avatarFileId },
          { merge: true },
        )
      } else {
        const { profilePhotoId: _drop, photoUrl: _dropUrl, ...rest } = staff
        await staffRef.set({ ...rest, id: staffId })
      }
    }
  }

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
