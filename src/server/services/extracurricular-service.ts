import 'server-only'

import { writeAuditLog } from '@/server/audit/logger'
import type { SessionContext } from '@/server/auth/session'
import { requirePermission } from '@/server/authorization/permissions'
import { notFound } from '@/server/errors'
import { getDoc, newId, queryCollection, setDoc, deleteDoc } from '@/server/repositories/firestore-repo'
import type {
  ClubCreateInput,
  HouseCreateInput,
  SportCreateInput,
  SubjectCreateInput,
  SubjectUpdateInput,
} from '@/server/validators/school'
import type { ClubActivity, House, Sport, SportKitItem, Student, Subject } from '@/types'

function emptyId(value?: string | null) {
  const v = value?.trim()
  return v ? v : undefined
}

function normalizeKits(kits?: SportKitItem[] | null): SportKitItem[] {
  if (!kits?.length) return []
  return kits
    .map((k) => ({
      id: k.id || newId('kit'),
      name: (k.name || '').trim(),
      quantity: Math.max(0, Number(k.quantity) || 0),
      jerseyNumbers: k.jerseyNumbers?.trim() || undefined,
      notes: k.notes?.trim() || undefined,
    }))
    .filter((k) => k.name.length > 0)
}

function normalizeSport(row: Sport): Sport {
  return {
    ...row,
    coachStaffId: emptyId(row.coachStaffId),
    leaderStaffId: emptyId(row.leaderStaffId),
    medicStaffIds: row.medicStaffIds ?? [],
    officialStaffIds: row.officialStaffIds ?? [],
    kits: normalizeKits(row.kits),
    active: row.active ?? true,
  }
}

function normalizeSubject(row: Subject): Subject {
  return {
    ...row,
    educationLevelIds: row.educationLevelIds ?? [],
    teacherIds: row.teacherIds ?? [],
    active: row.active ?? true,
  }
}

export async function listSubjects(session: SessionContext): Promise<Subject[]> {
  requirePermission(session, 'subjects.read')
  const rows = await queryCollection<Subject>('subjects', { limit: 100, orderBy: 'code' })
  return rows.map(normalizeSubject)
}

export async function createSubject(
  session: SessionContext,
  input: SubjectCreateInput,
  requestId?: string,
): Promise<Subject> {
  requirePermission(session, 'subjects.manage')
  const id = newId('sub')
  const row: Subject = {
    id,
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    category: input.category.trim(),
    educationLevelIds: [...input.educationLevelIds],
    teacherIds: [...input.teacherIds],
    active: input.active ?? true,
  }
  await setDoc('subjects', id, { ...row })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'subject.create',
    entityType: 'subjects',
    entityId: id,
    requestId,
  })
  return row
}

export async function updateSubject(
  session: SessionContext,
  id: string,
  patch: SubjectUpdateInput,
  requestId?: string,
): Promise<Subject> {
  requirePermission(session, 'subjects.manage')
  const current = await getDoc<Subject>('subjects', id)
  if (!current) throw notFound('Subject not found')
  const next = normalizeSubject({
    ...current,
    ...patch,
    id,
    code: patch.code?.trim().toUpperCase() ?? current.code,
    name: patch.name?.trim() ?? current.name,
    category: patch.category?.trim() ?? current.category,
    educationLevelIds: patch.educationLevelIds ?? current.educationLevelIds ?? [],
    teacherIds: patch.teacherIds ?? current.teacherIds ?? [],
    active: patch.active ?? current.active ?? true,
  })
  await setDoc('subjects', id, { ...next })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'subject.update',
    entityType: 'subjects',
    entityId: id,
    requestId,
  })
  return next
}

export async function deleteSubject(
  session: SessionContext,
  id: string,
  requestId?: string,
): Promise<{ deleted: true; id: string }> {
  requirePermission(session, 'subjects.manage')
  const current = await getDoc<Subject>('subjects', id)
  if (!current) throw notFound('Subject not found')

  const students = await queryCollection<Student>('students', { limit: 500 })
  for (const s of students) {
    if (!(s.subjectIds ?? []).includes(id)) continue
    await setDoc('students', s.id, {
      ...s,
      subjectIds: (s.subjectIds ?? []).filter((sid) => sid !== id),
    })
  }

  await deleteDoc('subjects', id)
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'subject.delete',
    entityType: 'subjects',
    entityId: id,
    requestId,
    metadata: { name: current.name, code: current.code },
  })
  return { deleted: true, id }
}

export async function listSports(session: SessionContext): Promise<Sport[]> {
  requirePermission(session, 'extracurricular.read')
  const rows = await queryCollection<Sport>('sports', { limit: 100, orderBy: 'name' })
  return rows.map(normalizeSport)
}

export async function createSport(
  session: SessionContext,
  input: SportCreateInput,
  requestId?: string,
): Promise<Sport> {
  requirePermission(session, 'extracurricular.manage')
  const id = newId('sport')
  const row = normalizeSport({
    id,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    active: input.active ?? true,
    coachStaffId: emptyId(input.coachStaffId),
    leaderStaffId: emptyId(input.leaderStaffId),
    medicStaffIds: [...(input.medicStaffIds ?? [])],
    officialStaffIds: [...(input.officialStaffIds ?? [])],
    kits: normalizeKits(input.kits),
  })
  await setDoc('sports', id, { ...row })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'sport.create',
    entityType: 'sports',
    entityId: id,
    requestId,
  })
  return row
}

export async function updateSport(
  session: SessionContext,
  id: string,
  patch: Partial<SportCreateInput>,
  requestId?: string,
): Promise<Sport> {
  requirePermission(session, 'extracurricular.manage')
  const current = await getDoc<Sport>('sports', id)
  if (!current) throw notFound('Sport not found')
  const next = normalizeSport({
    ...current,
    ...patch,
    id,
    name: patch.name?.trim() ?? current.name,
    description:
      patch.description !== undefined
        ? patch.description.trim() || undefined
        : current.description,
    active: patch.active ?? current.active,
    coachStaffId:
      patch.coachStaffId !== undefined
        ? emptyId(patch.coachStaffId)
        : current.coachStaffId,
    leaderStaffId:
      patch.leaderStaffId !== undefined
        ? emptyId(patch.leaderStaffId)
        : current.leaderStaffId,
    medicStaffIds: patch.medicStaffIds ?? current.medicStaffIds ?? [],
    officialStaffIds: patch.officialStaffIds ?? current.officialStaffIds ?? [],
    kits: patch.kits !== undefined ? normalizeKits(patch.kits) : current.kits ?? [],
  })
  await setDoc('sports', id, { ...next })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'sport.update',
    entityType: 'sports',
    entityId: id,
    requestId,
  })
  return next
}

export async function listClubs(session: SessionContext): Promise<ClubActivity[]> {
  requirePermission(session, 'extracurricular.read')
  return queryCollection<ClubActivity>('clubs', { limit: 100, orderBy: 'name' })
}

export async function createClub(
  session: SessionContext,
  input: ClubCreateInput,
  requestId?: string,
): Promise<ClubActivity> {
  requirePermission(session, 'extracurricular.manage')
  const id = newId('club')
  const row: ClubActivity = {
    id,
    name: input.name.trim(),
    type: input.type ?? 'CLUB',
    description: input.description?.trim() || undefined,
    active: input.active ?? true,
  }
  await setDoc('clubs', id, { ...row })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'club.create',
    entityType: 'clubs',
    entityId: id,
    requestId,
  })
  return row
}

export async function updateClub(
  session: SessionContext,
  id: string,
  patch: Partial<ClubCreateInput>,
  requestId?: string,
): Promise<ClubActivity> {
  requirePermission(session, 'extracurricular.manage')
  const current = await getDoc<ClubActivity>('clubs', id)
  if (!current) throw notFound('Club not found')
  const next: ClubActivity = {
    ...current,
    ...patch,
    id,
    name: patch.name?.trim() ?? current.name,
    description: patch.description?.trim() ?? current.description,
    active: patch.active ?? current.active,
  }
  await setDoc('clubs', id, { ...next })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'club.update',
    entityType: 'clubs',
    entityId: id,
    requestId,
  })
  return next
}

export async function listHouses(session: SessionContext): Promise<House[]> {
  requirePermission(session, 'extracurricular.read')
  return queryCollection<House>('houses', { limit: 100, orderBy: 'name' })
}

export async function createHouse(
  session: SessionContext,
  input: HouseCreateInput,
  requestId?: string,
): Promise<House> {
  requirePermission(session, 'extracurricular.manage')
  const id = newId('house')
  const row: House = {
    id,
    name: input.name.trim(),
    color: input.color?.trim() || undefined,
    active: input.active ?? true,
  }
  await setDoc('houses', id, { ...row })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'house.create',
    entityType: 'houses',
    entityId: id,
    requestId,
  })
  return row
}

export async function updateHouse(
  session: SessionContext,
  id: string,
  patch: Partial<HouseCreateInput>,
  requestId?: string,
): Promise<House> {
  requirePermission(session, 'extracurricular.manage')
  const current = await getDoc<House>('houses', id)
  if (!current) throw notFound('House not found')
  const next: House = {
    ...current,
    ...patch,
    id,
    name: patch.name?.trim() ?? current.name,
    color: patch.color?.trim() ?? current.color,
    active: patch.active ?? current.active,
  }
  await setDoc('houses', id, { ...next })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'house.update',
    entityType: 'houses',
    entityId: id,
    requestId,
  })
  return next
}
