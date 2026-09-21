import 'server-only'

import { writeAuditLog } from '@/server/audit/logger'
import type { SessionContext } from '@/server/auth/session'
import { requirePermission } from '@/server/authorization/permissions'
import type { MarkUpsertInput, ResultTransitionInput } from '@/server/validators/school'
import type { monthlyMarksSchema } from '@/server/validators/school'
import type { z } from 'zod'
import { getGradingScaleForEducationLevel, gradeFromScore } from '@/server/services/grading-service'
import type {
  Assessment,
  Mark,
  MarkWorkflowStatus,
  ResultAccessState,
  ResultPortalView,
  SchoolClass,
  Staff,
  Stream,
  Student,
  Subject,
  Term,
} from '@/types'
import { getDoc, newId, queryCollection, setDoc } from '@/server/repositories/firestore-repo'
import { assertCanAccessStudent } from '@/server/authorization/isolation'
import { badRequest, forbidden, notFound } from '@/server/errors'
import { isFeeCleared } from '@/server/services/finance-service'

export type MarkDto = Mark
export type AssessmentDto = Assessment
export type ResultPortalDto = ResultPortalView

/** DRAFT → SUBMITTED → APPROVED → PUBLISHED → LOCKED (+ UNDER_REVIEW bridge). */
const FORWARD: Record<MarkWorkflowStatus, MarkWorkflowStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['APPROVED', 'UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED'],
  APPROVED: ['PUBLISHED'],
  PUBLISHED: ['LOCKED'],
  LOCKED: [],
}

function assertTransition(from: MarkWorkflowStatus, to: MarkWorkflowStatus) {
  const allowed = FORWARD[from] ?? []
  if (!allowed.includes(to)) {
    throw badRequest(`Invalid status transition: ${from} → ${to}`)
  }
}

function isLocked(status: MarkWorkflowStatus) {
  return status === 'LOCKED'
}

function requireTransitionPermission(session: SessionContext, next: MarkWorkflowStatus) {
  if (next === 'APPROVED') requirePermission(session, 'results.approve')
  else if (next === 'PUBLISHED') requirePermission(session, 'results.publish')
  else if (next === 'LOCKED') requirePermission(session, 'results.lock')
  else requirePermission(session, 'results.update')
}

export async function upsertMark(
  session: SessionContext,
  input: MarkUpsertInput,
  requestId?: string,
): Promise<MarkDto> {
  requirePermission(session, 'results.enter')
  await assertCanAccessStudent(session, input.studentId)

  const assessment = await getDoc<Assessment>('assessments', input.assessmentId)
  if (!assessment) throw notFound('Assessment not found')
  if (isLocked(assessment.status)) {
    throw forbidden('Assessment is locked; marks cannot be edited')
  }

  const existing = await queryCollection<Mark>('marks', {
    limit: 1,
    where: [
      { field: 'assessmentId', op: '==', value: input.assessmentId },
      { field: 'studentId', op: '==', value: input.studentId },
    ],
  })

  const current = existing[0]
  if (current && isLocked(current.status)) {
    throw forbidden('Mark is locked; edits are blocked')
  }
  if (current && (current.status === 'PUBLISHED' || current.status === 'APPROVED')) {
    requirePermission(session, 'results.update')
  }

  const id = current?.id ?? newId('mk')
  const student = await getDoc<Student>('students', input.studentId)
  const klass = student
    ? await getDoc<SchoolClass>('classes', student.classId)
    : null
  const scale = await getGradingScaleForEducationLevel(
    student?.educationLevelId || klass?.educationLevelId,
  )
  const grade =
    input.grade?.trim() ||
    gradeFromScore(input.score, assessment.maxScore || 100, scale)
  const row: Mark = {
    id,
    assessmentId: input.assessmentId,
    studentId: input.studentId,
    score: input.score,
    grade,
    status: current?.status ?? 'DRAFT',
    recordedAt: new Date().toISOString(),
    recordedBy: session.uid,
  }

  await setDoc('marks', id, { ...row })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: current ? 'mark.update' : 'mark.create',
    entityType: 'marks',
    entityId: id,
    requestId,
  })
  return row
}

export async function transitionMarkStatus(
  session: SessionContext,
  markId: string,
  input: ResultTransitionInput,
  requestId?: string,
): Promise<MarkDto> {
  const mark = await getDoc<Mark>('marks', markId)
  if (!mark) throw notFound('Mark not found')
  if (isLocked(mark.status)) throw forbidden('Mark is locked')

  const next = input.status as MarkWorkflowStatus
  assertTransition(mark.status, next)
  requireTransitionPermission(session, next)

  const updated: Mark = { ...mark, status: next }
  await setDoc('marks', markId, { ...updated })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: `mark.transition.${next}`,
    entityType: 'marks',
    entityId: markId,
    requestId,
    metadata: { from: mark.status, to: next },
  })
  return updated
}

export async function transitionAssessmentStatus(
  session: SessionContext,
  assessmentId: string,
  input: ResultTransitionInput,
  requestId?: string,
): Promise<AssessmentDto> {
  const assessment = await getDoc<Assessment>('assessments', assessmentId)
  if (!assessment) throw notFound('Assessment not found')
  if (isLocked(assessment.status)) throw forbidden('Assessment is locked')

  const next = input.status as MarkWorkflowStatus
  assertTransition(assessment.status, next)
  requireTransitionPermission(session, next)

  const updated: Assessment = { ...assessment, status: next }
  await setDoc('assessments', assessmentId, { ...updated })

  if (next === 'PUBLISHED' || next === 'LOCKED') {
    const marks = await queryCollection<Mark>('marks', {
      limit: 100,
      where: [{ field: 'assessmentId', op: '==', value: assessmentId }],
    })
    for (const m of marks) {
      if (!isLocked(m.status)) {
        await setDoc('marks', m.id, { ...m, status: next })
      }
    }
  }

  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: `assessment.transition.${next}`,
    entityType: 'assessments',
    entityId: assessmentId,
    requestId,
    metadata: { from: assessment.status, to: next },
  })
  return updated
}

/**
 * Results portal: auth + relationship + published status + fee clearance.
 * Subjects returned only when accessState === RESULTS_AVAILABLE.
 */
export async function getResultsPortal(
  session: SessionContext,
  studentId: string,
  opts?: { termId?: string },
): Promise<ResultPortalDto> {
  requirePermission(session, 'results.read')
  const student = await assertCanAccessStudent(session, studentId)

  const [klass, stream, terms] = await Promise.all([
    getDoc<SchoolClass>('classes', student.classId),
    getDoc<Stream>('streams', student.streamId),
    queryCollection<Term>('terms', { limit: 100 }),
  ])

  const term =
    (opts?.termId ? terms.find((t) => t.id === opts.termId) : undefined) ??
    [...terms].sort((a, b) => b.sequence - a.sequence)[0]

  const assessments = await queryCollection<Assessment>('assessments', {
    limit: 100,
    ...(term
      ? { where: [{ field: 'termId', op: '==' as const, value: term.id }] }
      : {}),
  })

  const published = assessments.filter(
    (a) => a.status === 'PUBLISHED' || a.status === 'LOCKED',
  )

  let accessState: ResultAccessState = 'RESULTS_AVAILABLE'
  if (published.length === 0) {
    accessState = 'RESULTS_NOT_PUBLISHED'
  } else {
    const { getFeePolicy } = await import('@/server/services/school-settings-service')
    const policy = await getFeePolicy()
    if (policy.blockResultsWhenFeesOutstanding) {
      const cleared = await isFeeCleared(studentId)
      if (!cleared) accessState = 'RESULTS_LOCKED_FEES'
    }
  }

  const base = {
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`,
    className: klass?.name ?? student.classId,
    streamName: stream?.name ?? student.streamId,
    academicYear: klass?.academicYearId ?? '',
    term: term?.name ?? '',
  }

  if (accessState !== 'RESULTS_AVAILABLE') {
    return { ...base, accessState, subjects: [] }
  }

  const marks = await queryCollection<Mark>('marks', {
    limit: 100,
    where: [{ field: 'studentId', op: '==', value: studentId }],
  })
  const markByAssessment = new Map(marks.map((m) => [m.assessmentId, m]))
  const subjectsCatalog = await queryCollection<Subject>('subjects', { limit: 100 })
  const subjectName = new Map(subjectsCatalog.map((s) => [s.id, s.name]))

  const subjects = published
    .map((a) => {
      const m = markByAssessment.get(a.id)
      if (!m || (m.status !== 'PUBLISHED' && m.status !== 'LOCKED')) return null
      return {
        name: subjectName.get(a.subjectId) ?? a.subjectId,
        score: m.score,
        grade: m.grade,
      }
    })
    .filter((x): x is { name: string; score: number; grade: string } => x !== null)

  const monthlyMap = new Map<
    string,
    { month: string; label: string; rows: { subject: string; score: number; grade: string; maxScore: number }[] }
  >()
  for (const a of published) {
    if (a.type !== 'MONTHLY' || !a.month) continue
    const m = markByAssessment.get(a.id)
    if (!m || (m.status !== 'PUBLISHED' && m.status !== 'LOCKED')) continue
    const bucket =
      monthlyMap.get(a.month) ??
      ({
        month: a.month,
        label: formatMonthLabel(a.month),
        rows: [],
      } as {
        month: string
        label: string
        rows: { subject: string; score: number; grade: string; maxScore: number }[]
      })
    bucket.rows.push({
      subject: subjectName.get(a.subjectId) ?? a.subjectId,
      score: m.score,
      grade: m.grade,
      maxScore: a.maxScore,
    })
    monthlyMap.set(a.month, bucket)
  }
  const monthly = [...monthlyMap.values()]
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((block) => ({
      ...block,
      average:
        block.rows.length > 0
          ? block.rows.reduce((s, r) => s + (r.score / r.maxScore) * 100, 0) / block.rows.length
          : undefined,
    }))

  const overallAverage =
    subjects.length > 0
      ? subjects.reduce((s, x) => s + x.score, 0) / subjects.length
      : undefined

  return {
    ...base,
    accessState: 'RESULTS_AVAILABLE',
    subjects,
    monthly,
    overallAverage,
  }
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })
}

async function assertTeacherCanEnter(
  session: SessionContext,
  classId: string,
  subjectId: string,
) {
  if (session.role !== 'TEACHER') return
  const staffId = session.profile.staffId
  if (!staffId) throw forbidden('Teacher profile is not linked')
  const staff = await getDoc<Staff>('staff', staffId)
  if (!staff) throw forbidden('Teacher profile not found')
  if (!(staff.classIds ?? []).includes(classId)) {
    throw forbidden('You are not assigned to teach this class')
  }
  if (!(staff.subjectIds ?? []).includes(subjectId)) {
    throw forbidden('You are not assigned to teach this subject')
  }
}

/**
 * Create/update an end-of-month test for a class+subject and save student marks.
 * Grades are assigned automatically from the school grading scale.
 */
export async function submitMonthlyMarks(
  session: SessionContext,
  input: z.infer<typeof monthlyMarksSchema>,
  requestId?: string,
): Promise<{ assessment: AssessmentDto; marks: MarkDto[] }> {
  requirePermission(session, 'results.enter')
  await assertTeacherCanEnter(session, input.classId, input.subjectId)

  const cls = await getDoc<SchoolClass>('classes', input.classId)
  if (!cls) throw notFound('Class not found')
  const subject = await getDoc<Subject>('subjects', input.subjectId)
  if (!subject) throw notFound('Subject not found')

  const students = await queryCollection<Student>('students', {
    limit: 100,
    where: [{ field: 'classId', op: '==', value: input.classId }],
  })
  const active = students.filter((s) => s.status === 'ACTIVE')
  const allowed = new Set(active.map((s) => s.id))
  for (const entry of input.entries) {
    if (!allowed.has(entry.studentId)) {
      throw badRequest(`Student ${entry.studentId} is not in this class`)
    }
    await assertCanAccessStudent(session, entry.studentId)
  }

  const streamId = active[0]?.streamId || `stream_${input.classId}`
  const termId = cls.termId || 'term_current'
  const assessmentId = `as_monthly_${input.classId}_${input.subjectId}_${input.month}`.replace(
    /[^a-zA-Z0-9_-]/g,
    '_',
  )
  const status: MarkWorkflowStatus = input.publish ? 'PUBLISHED' : 'DRAFT'
  const monthLabel = formatMonthLabel(input.month)
  const assessment: Assessment = {
    id: assessmentId,
    name: `${subject.name} · ${monthLabel}`,
    type: 'MONTHLY',
    subjectId: input.subjectId,
    streamId,
    termId,
    maxScore: input.maxScore,
    status,
    classId: input.classId,
    month: input.month,
  }
  await setDoc('assessments', assessmentId, { ...assessment })

  const classScale = await getGradingScaleForEducationLevel(cls.educationLevelId)
  const scaleByLevel = new Map<string, Awaited<ReturnType<typeof getGradingScaleForEducationLevel>>>()
  const marks: MarkDto[] = []
  for (const entry of input.entries) {
    const markId = `mk_${assessmentId}_${entry.studentId}`.replace(/[^a-zA-Z0-9_-]/g, '_')
    const student = active.find((s) => s.id === entry.studentId)
    const levelKey = student?.educationLevelId || cls.educationLevelId || 'form-1'
    let studentScale = scaleByLevel.get(levelKey)
    if (!studentScale) {
      studentScale = student?.educationLevelId
        ? await getGradingScaleForEducationLevel(student.educationLevelId)
        : classScale
      scaleByLevel.set(levelKey, studentScale)
    }
    const row: Mark = {
      id: markId,
      assessmentId,
      studentId: entry.studentId,
      score: entry.score,
      grade: gradeFromScore(entry.score, input.maxScore, studentScale),
      status,
      recordedAt: new Date().toISOString(),
      recordedBy: session.uid,
    }
    await setDoc('marks', markId, { ...row })
    marks.push(row)
  }

  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'marks.monthly_submit',
    entityType: 'assessments',
    entityId: assessmentId,
    requestId,
    metadata: {
      classId: input.classId,
      subjectId: input.subjectId,
      month: input.month,
      count: marks.length,
      publish: Boolean(input.publish),
    },
  })

  return { assessment, marks }
}

export async function listAssessments(session: SessionContext): Promise<AssessmentDto[]> {
  requirePermission(session, 'results.read')
  let rows = await queryCollection<Assessment>('assessments', { limit: 100 })
  if (session.role === 'TEACHER') {
    const staffId = session.profile.staffId
    const staff = staffId ? await getDoc<Staff>('staff', staffId) : null
    const subjects = new Set(staff?.subjectIds ?? [])
    const classIds = new Set(staff?.classIds ?? [])
    rows = rows.filter(
      (a) =>
        subjects.has(a.subjectId) &&
        (!a.classId || classIds.has(a.classId)),
    )
  }
  return rows
}

export async function listMarks(session: SessionContext): Promise<MarkDto[]> {
  requirePermission(session, 'results.read')
  return queryCollection<Mark>('marks', { limit: 100 })
}

export const getResultPortalService = getResultsPortal
export const getResultsPortalService = getResultsPortal
export const listAssessmentsService = listAssessments
export const listMarksService = listMarks
export const upsertMarkService = upsertMark
export const submitMonthlyMarksService = submitMonthlyMarks

export async function transitionAssessmentService(
  session: SessionContext,
  assessmentId: string,
  status: ResultTransitionInput['status'],
  requestId?: string,
) {
  return transitionAssessmentStatus(session, assessmentId, { status }, requestId)
}
