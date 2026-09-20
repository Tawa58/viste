import 'server-only'

import { writeAuditLog } from '@/server/audit/logger'
import type { SessionContext } from '@/server/auth/session'
import { requirePermission } from '@/server/authorization/permissions'
import {
  assertCanAccessStudent,
  listAccessibleStudents,
} from '@/server/authorization/isolation'
import { badRequest, notFound } from '@/server/errors'
import { getDoc, newId, setDoc } from '@/server/repositories/firestore-repo'
import type { StudentCreateInput, StudentUpdateInput } from '@/server/validators/school'
import type { Student } from '@/types'

export type StudentDto = Student

export async function listStudents(session: SessionContext): Promise<StudentDto[]> {
  requirePermission(session, 'students.read')
  return listAccessibleStudents(session)
}

export async function getStudent(session: SessionContext, id: string): Promise<StudentDto> {
  requirePermission(session, 'students.read')
  return assertCanAccessStudent(session, id)
}

export async function createStudent(
  session: SessionContext,
  input: StudentCreateInput,
  requestId?: string,
): Promise<StudentDto> {
  requirePermission(session, 'students.create')
  const id = newId('stu')
  const row: Student = {
    ...input,
    id,
    email: input.email || undefined,
    subjectIds: [...input.subjectIds],
    guardianIds: [...input.guardianIds],
  }
  await setDoc('students', id, { ...row })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'student.create',
    entityType: 'students',
    entityId: id,
    requestId,
  })
  return row
}

export async function updateStudent(
  session: SessionContext,
  id: string,
  patch: StudentUpdateInput,
  requestId?: string,
): Promise<StudentDto> {
  requirePermission(session, 'students.update')
  await assertCanAccessStudent(session, id)

  if (session.role === 'TEACHER') {
    const allowed = new Set(['phone', 'email', 'address', 'profilePhotoId'])
    for (const key of Object.keys(patch)) {
      if (!allowed.has(key)) {
        throw badRequest(`Teachers cannot update field: ${key}`)
      }
    }
  }

  const current = await getDoc<Student>('students', id)
  if (!current) throw notFound('Student not found')

  const next: Student = {
    ...current,
    ...patch,
    id,
    subjectIds: patch.subjectIds ?? current.subjectIds,
    guardianIds: patch.guardianIds ?? current.guardianIds,
  }
  await setDoc('students', id, { ...next })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'student.update',
    entityType: 'students',
    entityId: id,
    requestId,
    metadata: { fields: Object.keys(patch) },
  })
  return next
}

export async function archiveStudent(
  session: SessionContext,
  id: string,
  requestId?: string,
): Promise<StudentDto> {
  requirePermission(session, 'students.archive')
  await assertCanAccessStudent(session, id)
  const current = await getDoc<Student>('students', id)
  if (!current) throw notFound('Student not found')
  const next: Student = { ...current, status: 'INACTIVE' }
  await setDoc('students', id, { ...next })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'student.archive',
    entityType: 'students',
    entityId: id,
    requestId,
  })
  return next
}

// Aliases matching earlier drafts / API routes
export const listStudentsService = listStudents
export const getStudentService = getStudent
export const createStudentService = createStudent
export const updateStudentService = updateStudent
export const archiveStudentService = archiveStudent

export { listStaffService } from '@/server/services/staff-service'
