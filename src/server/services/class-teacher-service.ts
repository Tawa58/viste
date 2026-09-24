import 'server-only'

import { writeAuditLog } from '@/server/audit/logger'
import type { SessionContext } from '@/server/auth/session'
import { requirePermission } from '@/server/authorization/permissions'
import {
  assertIsClassTeacher,
  assertTeacherOwnsClass,
} from '@/server/authorization/isolation'
import { badRequest, notFound } from '@/server/errors'
import { getDoc, queryCollection, setDoc } from '@/server/repositories/firestore-repo'
import type {
  classTeacherReportsUpsertSchema,
  dutyRosterUpsertSchema,
} from '@/server/validators/school'
import type { z } from 'zod'
import type {
  ClassTeacherReport,
  DutyRoster,
  SchoolClass,
  Student,
  Term,
} from '@/types'

export type ClassTeacherReportDto = ClassTeacherReport
export type DutyRosterDto = DutyRoster

function reportId(classId: string, termId: string, studentId: string) {
  return `ctr_${classId}_${termId}_${studentId}`.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function rosterId(classId: string, weekOf: string) {
  return `duty_${classId}_${weekOf}`.replace(/[^a-zA-Z0-9_-]/g, '_')
}

async function assertClassTeacherOrAdmin(session: SessionContext, classId: string) {
  if (session.role === 'TEACHER') {
    await assertIsClassTeacher(session, classId)
  } else {
    await assertTeacherOwnsClass(session, classId)
  }
}

export async function listClassTeacherReports(
  session: SessionContext,
  classId: string,
  termId: string,
): Promise<ClassTeacherReportDto[]> {
  requirePermission(session, 'results.read')
  await assertClassTeacherOrAdmin(session, classId)
  const rows = await queryCollection<ClassTeacherReport>('classTeacherReports', {
    limit: 200,
    where: [{ field: 'classId', op: '==', value: classId }],
  })
  return rows.filter((r) => r.termId === termId)
}

export async function upsertClassTeacherReports(
  session: SessionContext,
  classId: string,
  input: z.infer<typeof classTeacherReportsUpsertSchema>,
  requestId?: string,
): Promise<ClassTeacherReportDto[]> {
  requirePermission(session, 'results.enter')
  await assertClassTeacherOrAdmin(session, classId)

  const cls = await getDoc<SchoolClass>('classes', classId)
  if (!cls) throw notFound('Class not found')
  const term = await getDoc<Term>('terms', input.termId)
  if (!term) throw notFound('Term not found')

  const students = await queryCollection<Student>('students', {
    limit: 200,
    where: [{ field: 'classId', op: '==', value: classId }],
  })
  const allowed = new Set(
    students.filter((s) => s.status === 'ACTIVE').map((s) => s.id),
  )

  const now = new Date().toISOString()
  const saved: ClassTeacherReportDto[] = []
  for (const entry of input.entries) {
    if (!allowed.has(entry.studentId)) {
      throw badRequest(`Student ${entry.studentId} is not in this class`)
    }
    const id = reportId(classId, input.termId, entry.studentId)
    const row: ClassTeacherReport = {
      id,
      classId,
      studentId: entry.studentId,
      termId: input.termId,
      comment: entry.comment.trim(),
      updatedAt: now,
      updatedBy: session.uid,
      updatedByName: session.profile.name,
    }
    await setDoc('classTeacherReports', id, { ...row })
    saved.push(row)
  }

  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'classTeacher.report.upsert',
    entityType: 'classTeacherReports',
    entityId: classId,
    requestId,
    metadata: { termId: input.termId, count: saved.length },
  })
  return saved
}

export async function getDutyRoster(
  session: SessionContext,
  classId: string,
  weekOf: string,
): Promise<DutyRosterDto | null> {
  requirePermission(session, 'classes.read')
  await assertClassTeacherOrAdmin(session, classId)
  const id = rosterId(classId, weekOf)
  return (await getDoc<DutyRoster>('dutyRosters', id)) ?? null
}

export async function upsertDutyRoster(
  session: SessionContext,
  classId: string,
  input: z.infer<typeof dutyRosterUpsertSchema>,
  requestId?: string,
): Promise<DutyRosterDto> {
  requirePermission(session, 'classes.read')
  await assertClassTeacherOrAdmin(session, classId)

  const cls = await getDoc<SchoolClass>('classes', classId)
  if (!cls) throw notFound('Class not found')

  const id = rosterId(classId, input.weekOf)
  const row: DutyRoster = {
    id,
    classId,
    weekOf: input.weekOf,
    entries: input.entries.map((e) => ({
      day: e.day,
      duty: e.duty.trim(),
      assigneeName: e.assigneeName?.trim() || undefined,
      studentId: e.studentId,
      notes: e.notes?.trim() || undefined,
    })),
    updatedAt: new Date().toISOString(),
    updatedBy: session.uid,
    updatedByName: session.profile.name,
  }
  await setDoc('dutyRosters', id, { ...row })

  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'classTeacher.dutyRoster.upsert',
    entityType: 'dutyRosters',
    entityId: id,
    requestId,
    metadata: { classId, weekOf: input.weekOf, count: row.entries.length },
  })
  return row
}

export async function getClassTeacherCommentForStudent(
  studentId: string,
  classId: string,
  termId?: string,
): Promise<string | undefined> {
  if (!termId) return undefined
  const id = reportId(classId, termId, studentId)
  const row = await getDoc<ClassTeacherReport>('classTeacherReports', id)
  return row?.comment?.trim() || undefined
}
