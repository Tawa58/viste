import 'server-only'

import { writeAuditLog } from '@/server/audit/logger'
import type { SessionContext } from '@/server/auth/session'
import { requirePermission } from '@/server/authorization/permissions'
import {
  assertCanAccessStudent,
  assertTeacherOwnsClass,
  listAccessibleStudents,
} from '@/server/authorization/isolation'
import { notFound } from '@/server/errors'
import {
  getDoc,
  newId,
  queryCollection,
  setDoc,
  type WhereClause,
} from '@/server/repositories/firestore-repo'
import type { attendanceUpsertSchema } from '@/server/validators/school'
import type { z } from 'zod'
import type { AttendanceRecord } from '@/types'

export type AttendanceDto = AttendanceRecord

export async function listAttendance(
  session: SessionContext,
  opts?: { date?: string; classId?: string; studentId?: string },
): Promise<AttendanceDto[]> {
  requirePermission(session, 'attendance.read')

  if (opts?.studentId) {
    await assertCanAccessStudent(session, opts.studentId)
    return queryCollection<AttendanceRecord>('attendance', {
      limit: 100,
      where: [{ field: 'studentId', op: '==', value: opts.studentId }],
    })
  }

  // Role-scoped: parents/students only see linked students
  if (session.role === 'PARENT' || session.role === 'STUDENT') {
    const students = await listAccessibleStudents(session)
    const ids = new Set(students.map((s) => s.id))
    const all = await queryCollection<AttendanceRecord>('attendance', {
      limit: 100,
      ...(opts?.date
        ? { where: [{ field: 'date', op: '==' as const, value: opts.date }] }
        : {}),
    })
    return all.filter((r) => ids.has(r.studentId))
  }

  const where: WhereClause[] = []
  if (opts?.date) where.push({ field: 'date', op: '==', value: opts.date })
  if (opts?.classId) where.push({ field: 'classId', op: '==', value: opts.classId })

  return queryCollection<AttendanceRecord>('attendance', {
    limit: 100,
    where: where.length ? where : undefined,
  })
}

export async function upsertAttendance(
  session: SessionContext,
  input: z.infer<typeof attendanceUpsertSchema>,
  requestId?: string,
): Promise<AttendanceDto> {
  requirePermission(session, 'attendance.create')
  await assertCanAccessStudent(session, input.studentId)
  await assertTeacherOwnsClass(session, input.classId)

  const existing = await queryCollection<AttendanceRecord>('attendance', {
    limit: 1,
    where: [
      { field: 'date', op: '==', value: input.date },
      { field: 'studentId', op: '==', value: input.studentId },
      ...(input.subjectId
        ? [{ field: 'subjectId', op: '==' as const, value: input.subjectId }]
        : []),
    ],
  })

  const id = existing[0]?.id ?? newId('att')
  const row: AttendanceRecord = {
    id,
    date: input.date,
    studentId: input.studentId,
    classId: input.classId,
    streamId: input.streamId,
    subjectId: input.subjectId,
    status: input.status,
    recordedBy: session.uid,
  }

  await setDoc('attendance', id, { ...row })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: existing[0] ? 'attendance.update' : 'attendance.create',
    entityType: 'attendance',
    entityId: id,
    requestId,
    metadata: { studentId: input.studentId, status: input.status },
  })
  return row
}

export async function getAttendance(
  session: SessionContext,
  id: string,
): Promise<AttendanceDto> {
  requirePermission(session, 'attendance.read')
  const row = await getDoc<AttendanceRecord>('attendance', id)
  if (!row) throw notFound('Attendance record not found')
  await assertCanAccessStudent(session, row.studentId)
  return row
}
