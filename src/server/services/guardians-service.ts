import 'server-only'

import { writeAuditLog } from '@/server/audit/logger'
import type { SessionContext } from '@/server/auth/session'
import { requirePermission } from '@/server/authorization/permissions'
import { assertParentLinked } from '@/server/authorization/isolation'
import { notFound } from '@/server/errors'
import { getDoc, newId, queryCollection, setDoc, deleteDoc } from '@/server/repositories/firestore-repo'
import type { GuardianCreateInput } from '@/server/validators/school'
import type { guardianUpdateSchema } from '@/server/validators/school'
import type { z } from 'zod'
import type { Guardian, Student } from '@/types'

export type GuardianDto = Guardian

export async function listGuardians(session: SessionContext): Promise<GuardianDto[]> {
  requirePermission(session, 'parents.read')
  if (session.role === 'PARENT') {
    if (!session.profile.guardianId) return []
    const g = await getDoc<Guardian>('guardians', session.profile.guardianId)
    return g ? [g] : []
  }
  return queryCollection<Guardian>('guardians', { limit: 100 })
}

export async function getGuardian(session: SessionContext, id: string): Promise<GuardianDto> {
  requirePermission(session, 'parents.read')
  if (session.role === 'PARENT' && session.profile.guardianId !== id) {
    throw notFound('Guardian not found')
  }
  const g = await getDoc<Guardian>('guardians', id)
  if (!g) throw notFound('Guardian not found')
  return g
}

export async function createGuardian(
  session: SessionContext,
  input: GuardianCreateInput,
  requestId?: string,
): Promise<GuardianDto> {
  requirePermission(session, 'parents.manage')
  const id = newId('g')
  const row: Guardian = {
    ...input,
    id,
    email: input.email?.trim() || '',
    address: input.address?.trim() || '—',
    studentIds: [...input.studentIds],
  }
  await setDoc('guardians', id, { ...row })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'guardian.create',
    entityType: 'guardians',
    entityId: id,
    requestId,
  })
  return row
}

export async function updateGuardian(
  session: SessionContext,
  id: string,
  patch: z.infer<typeof guardianUpdateSchema>,
  requestId?: string,
): Promise<GuardianDto> {
  requirePermission(session, 'parents.manage')
  const current = await getDoc<Guardian>('guardians', id)
  if (!current) throw notFound('Guardian not found')
  const next: Guardian = {
    ...current,
    ...patch,
    id,
    studentIds: patch.studentIds ?? current.studentIds,
  }
  await setDoc('guardians', id, { ...next })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'guardian.update',
    entityType: 'guardians',
    entityId: id,
    requestId,
  })
  return next
}

export async function deleteGuardian(
  session: SessionContext,
  id: string,
  requestId?: string,
): Promise<{ deleted: true; id: string }> {
  requirePermission(session, 'parents.manage')
  const current = await getDoc<Guardian>('guardians', id)
  if (!current) throw notFound('Guardian not found')

  const students = await queryCollection<Student>('students', { limit: 300 })
  for (const s of students) {
    if (!(s.guardianIds ?? []).includes(id)) continue
    await setDoc('students', s.id, {
      ...s,
      guardianIds: (s.guardianIds ?? []).filter((gid) => gid !== id),
    })
  }

  await deleteDoc('guardians', id)
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'guardian.delete',
    entityType: 'guardians',
    entityId: id,
    requestId,
    metadata: { name: `${current.firstName} ${current.lastName}` },
  })
  return { deleted: true, id }
}

/** Verify parent session is linked to student (portal isolation). */
export async function assertGuardianLinkedToStudent(
  session: SessionContext,
  studentId: string,
) {
  return assertParentLinked(session, studentId)
}

export const listGuardiansService = listGuardians
export const createGuardianService = createGuardian
export const updateGuardianService = updateGuardian
export const deleteGuardianService = deleteGuardian
