import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { badRequest } from '@/server/errors'
import { getAdminAuth } from '@/lib/firebase/admin'
import { clearTemporaryPasswordFlagService } from '@/server/services/staff-service'
import { writeAuditLog } from '@/server/audit/logger'
import { z } from 'zod'

const changePasswordSchema = z.object({
  /** Client already reauthenticated + updated Firebase Auth; this confirms and clears temp flag. */
  acknowledge: z.literal(true).optional(),
  /** Optional server-side password set (admin Auth) when client cannot change it. */
  newPassword: z.string().min(8).max(128).optional(),
})

/**
 * After a teacher changes their Firebase password in Settings, call this to remove
 * the admin “Temp password” tag from the login sheet.
 */
export const POST = withApiHandler(async (request, { requestId }) => {
  const session = await requireSession(request)
  const body = await request.json().catch(() => null)
  const parsed = changePasswordSchema.safeParse(body ?? { acknowledge: true })
  if (!parsed.success) throw badRequest('Invalid password change payload', parsed.error.flatten())

  if (parsed.data.newPassword) {
    await getAdminAuth().updateUser(session.uid, { password: parsed.data.newPassword })
  }

  const result = await clearTemporaryPasswordFlagService(session)
  if (session.role === 'STUDENT' && session.profile.studentId) {
    const { markStudentCodeChanged } = await import('@/server/services/student-portal-service')
    await markStudentCodeChanged(session.profile.studentId)
  }
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'auth.password_changed',
    entityType: 'users',
    entityId: session.uid,
    requestId,
    metadata: { temporaryCleared: result.cleared },
  })
  return jsonOk(result)
})
