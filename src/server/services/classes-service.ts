import 'server-only'

import { writeAuditLog } from '@/server/audit/logger'
import type { SessionContext } from '@/server/auth/session'
import { requirePermission } from '@/server/authorization/permissions'
import { badRequest, notFound } from '@/server/errors'
import {
  educationLevelName,
  getEducationLevel,
} from '@/lib/education-levels'
import { getDoc, newId, queryCollection, setDoc } from '@/server/repositories/firestore-repo'
import type { ClassCreateInput, ClassUpdateInput } from '@/server/validators/school'
import type { SchoolClass, Stream, Student, StudentClassStats } from '@/types'

export type ClassDto = SchoolClass

function normalizeClass(row: SchoolClass): SchoolClass {
  return {
    ...row,
    status: row.status ?? 'ACTIVE',
    level: row.level || educationLevelName(row.educationLevelId) || row.name,
  }
}

export async function listClasses(session: SessionContext): Promise<ClassDto[]> {
  requirePermission(session, 'classes.read')
  const rows = await queryCollection<SchoolClass>('classes', { limit: 100, orderBy: 'name' })
  return rows.map(normalizeClass)
}

export async function getClass(session: SessionContext, id: string): Promise<ClassDto> {
  requirePermission(session, 'classes.read')
  const row = await getDoc<SchoolClass>('classes', id)
  if (!row) throw notFound('Class not found')
  return normalizeClass(row)
}

export async function createClass(
  session: SessionContext,
  input: ClassCreateInput,
  requestId?: string,
): Promise<ClassDto> {
  requirePermission(session, 'classes.manage')
  const level = getEducationLevel(input.educationLevelId)
  if (!level) throw badRequest('Invalid education level')

  const id = newId('cls')
  const row: SchoolClass = {
    id,
    name: input.name.trim(),
    educationLevelId: input.educationLevelId,
    level: level.name,
    academicYearId: input.academicYearId,
    termId: input.termId || undefined,
    classTeacherId: input.classTeacherId || undefined,
    description: input.description?.trim() || undefined,
    capacity: input.capacity,
    status: input.status ?? 'ACTIVE',
  }
  await setDoc('classes', id, { ...row })

  // Default stream keeps attendance/results compatibility (one stream per class).
  const streamId = newId('str')
  const stream: Stream = {
    id: streamId,
    classId: id,
    name: row.name,
    capacity: input.capacity ?? 40,
  }
  await setDoc('streams', streamId, { ...stream })

  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'class.create',
    entityType: 'classes',
    entityId: id,
    requestId,
  })
  return row
}

export async function updateClass(
  session: SessionContext,
  id: string,
  patch: ClassUpdateInput,
  requestId?: string,
): Promise<ClassDto> {
  requirePermission(session, 'classes.manage')
  const current = await getDoc<SchoolClass>('classes', id)
  if (!current) throw notFound('Class not found')

  if (patch.educationLevelId) {
    const level = getEducationLevel(patch.educationLevelId)
    if (!level) throw badRequest('Invalid education level')
  }

  const educationLevelId = patch.educationLevelId ?? current.educationLevelId
  const levelName = educationLevelName(educationLevelId) || current.level

  const next: SchoolClass = {
    ...current,
    ...patch,
    id,
    name: patch.name?.trim() ?? current.name,
    educationLevelId,
    level: levelName,
    termId:
      patch.termId === ''
        ? undefined
        : (patch.termId ?? current.termId),
    classTeacherId:
      patch.classTeacherId === ''
        ? undefined
        : (patch.classTeacherId ?? current.classTeacherId),
    description: patch.description?.trim() ?? current.description,
    status: patch.status ?? current.status ?? 'ACTIVE',
  }
  await setDoc('classes', id, { ...next })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'class.update',
    entityType: 'classes',
    entityId: id,
    requestId,
    metadata: { fields: Object.keys(patch) },
  })
  return normalizeClass(next)
}

export async function archiveClass(
  session: SessionContext,
  id: string,
  requestId?: string,
): Promise<ClassDto> {
  return updateClass(session, id, { status: 'ARCHIVED' }, requestId)
}

/** Prefer the first stream for a class (created automatically with the class). */
export async function getDefaultStreamForClass(classId: string): Promise<Stream | null> {
  const streams = await queryCollection<Stream>('streams', { limit: 100 })
  return streams.find((s) => s.classId === classId) ?? null
}

export async function getStudentClassStats(
  session: SessionContext,
): Promise<StudentClassStats> {
  requirePermission(session, 'students.read')
  const [students, classes] = await Promise.all([
    queryCollection<Student>('students', { limit: 100 }),
    queryCollection<SchoolClass>('classes', { limit: 100 }),
  ])

  const activeClasses = classes.filter((c) => (c.status ?? 'ACTIVE') === 'ACTIVE')

  const bandCount = { ECD: 0, PRIMARY: 0, SECONDARY: 0 }
  for (const s of students) {
    if (s.status !== 'ACTIVE') continue
    const cls = classes.find((c) => c.id === s.classId)
    const levelId = s.educationLevelId || cls?.educationLevelId
    const level = getEducationLevel(levelId)
    if (level) bandCount[level.band] += 1
  }

  const classDistribution = activeClasses
    .map((c) => ({
      classId: c.id,
      className: c.name,
      count: students.filter((s) => s.classId === c.id && s.status === 'ACTIVE').length,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    totalStudents: students.length,
    totalClasses: activeClasses.length,
    ecdStudents: bandCount.ECD,
    primaryStudents: bandCount.PRIMARY,
    secondaryStudents: bandCount.SECONDARY,
    activeStudents: students.filter((s) => s.status === 'ACTIVE').length,
    transferredStudents: students.filter((s) => s.status === 'TRANSFERRED').length,
    archivedStudents: students.filter((s) => s.status === 'ARCHIVED' || s.status === 'INACTIVE')
      .length,
    classDistribution,
  }
}

export const listClassesService = listClasses
export const getClassService = getClass
export const createClassService = createClass
export const updateClassService = updateClass
export const archiveClassService = archiveClass
export const getStudentClassStatsService = getStudentClassStats
