import 'server-only'

import { getAdminDb } from '@/lib/firebase/admin'
import type { SessionContext } from '@/server/auth/session'
import { forbidden, notFound } from '@/server/errors'
import type { Guardian, Staff, Student } from '@/types'

const FULL_STUDENT_ACCESS = new Set([
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'PRINCIPAL',
  'REGISTRAR',
  'RECEPTIONIST',
  'ACCOUNTANT',
  'FINANCE_OFFICER',
  'LIBRARIAN',
  'TRANSPORT_MANAGER',
])

export async function getStudentOrThrow(id: string): Promise<Student> {
  const snap = await getAdminDb().collection('students').doc(id).get()
  if (!snap.exists) throw notFound('Student not found')
  return { id: snap.id, ...(snap.data() as Omit<Student, 'id'>) }
}

export async function getGuardianOrThrow(id: string): Promise<Guardian> {
  const snap = await getAdminDb().collection('guardians').doc(id).get()
  if (!snap.exists) throw notFound('Guardian not found')
  return { id: snap.id, ...(snap.data() as Omit<Guardian, 'id'>) }
}

async function getStaffForSession(session: SessionContext): Promise<Staff | null> {
  const staffId = session.profile.staffId
  if (!staffId) return null
  const snap = await getAdminDb().collection('staff').doc(staffId).get()
  if (!snap.exists) return null
  return { id: snap.id, ...(snap.data() as Omit<Staff, 'id'>) }
}

/** Ensure session parent is linked to the given student via guardians/{guardianId}. */
export async function assertParentLinked(
  session: SessionContext,
  studentId: string,
): Promise<Guardian> {
  if (session.role !== 'PARENT') {
    throw forbidden('Parent relationship required')
  }
  const guardianId = session.profile.guardianId
  if (!guardianId) throw forbidden('Parent profile is not linked')
  const guardian = await getGuardianOrThrow(guardianId)
  if (!guardian.studentIds.includes(studentId)) {
    throw forbidden('Parent is not linked to this student')
  }
  return guardian
}

/**
 * Server-side relationship check — never trust client parent/student ids alone.
 * Accepts either a student id string or a loaded Student.
 */
export async function assertCanAccessStudent(
  session: SessionContext,
  student: string | Student,
): Promise<Student> {
  const studentId = typeof student === 'string' ? student : student.id
  const loaded =
    typeof student === 'string' ? await getStudentOrThrow(studentId) : student

  if (FULL_STUDENT_ACCESS.has(session.role)) return loaded

  if (session.role === 'TEACHER') {
    const staff = await getStaffForSession(session)
    if (!staff) throw forbidden('Teacher profile is not linked to staff')
    const classIds = staff.classIds ?? []
    if (!classIds.includes(loaded.classId)) {
      throw forbidden("Teacher is not assigned to this student's class")
    }
    return loaded
  }

  if (session.role === 'STUDENT') {
    if (session.profile.studentId !== studentId) {
      throw forbidden('Student record access denied')
    }
    return loaded
  }

  if (session.role === 'PARENT') {
    await assertParentLinked(session, studentId)
    return loaded
  }

  throw forbidden('Student record access denied')
}

/** Filter an in-memory student list to what the role may see. */
export function filterStudentsForRole(
  session: SessionContext,
  students: Student[],
  linkedStudentIds?: string[],
  teacherClassIds?: string[],
): Student[] {
  if (FULL_STUDENT_ACCESS.has(session.role)) return students

  if (session.role === 'TEACHER') {
    const ids = new Set(teacherClassIds ?? [])
    return students.filter((s) => ids.has(s.classId))
  }

  if (session.role === 'STUDENT') {
    const id = session.profile.studentId
    return id ? students.filter((s) => s.id === id) : []
  }

  if (session.role === 'PARENT') {
    const ids = new Set(linkedStudentIds ?? [])
    return students.filter((s) => ids.has(s.id))
  }

  return []
}

export async function listAccessibleStudents(session: SessionContext): Promise<Student[]> {
  const db = getAdminDb()

  if (session.role === 'STUDENT') {
    if (!session.profile.studentId) return []
    return [await getStudentOrThrow(session.profile.studentId)]
  }

  if (session.role === 'PARENT') {
    if (!session.profile.guardianId) return []
    const guardian = await getGuardianOrThrow(session.profile.guardianId)
    const out: Student[] = []
    for (const id of guardian.studentIds) {
      const snap = await db.collection('students').doc(id).get()
      if (snap.exists) {
        out.push({ id: snap.id, ...(snap.data() as Omit<Student, 'id'>) })
      }
    }
    return out
  }

  if (session.role === 'TEACHER') {
    const staff = await getStaffForSession(session)
    const classIds = new Set(staff?.classIds ?? [])
    if (classIds.size === 0) return []
    const snap = await db.collection('students').limit(500).get()
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Student, 'id'>) }))
      .filter((s) => classIds.has(s.classId))
  }

  const snap = await db.collection('students').limit(500).get()
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Student, 'id'>) }))
}

/** Teachers may only manage students in assigned classIds (when staff profile exists). */
export async function assertTeacherOwnsClass(
  session: SessionContext,
  classId: string,
): Promise<void> {
  if (session.role !== 'TEACHER') return
  const staff = await getStaffForSession(session)
  if (!staff) throw forbidden('Teacher profile is not linked to staff')
  if (!staff.classIds?.includes(classId)) {
    throw forbidden('Teacher is not assigned to this class')
  }
}

export async function assertCanAccessInvoiceStudent(
  session: SessionContext,
  studentId: string,
): Promise<Student> {
  return assertCanAccessStudent(session, studentId)
}
