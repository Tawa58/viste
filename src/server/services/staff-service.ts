import 'server-only'

import { randomBytes } from 'node:crypto'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import { writeAuditLog } from '@/server/audit/logger'
import type { SessionContext } from '@/server/auth/session'
import { requirePermission } from '@/server/authorization/permissions'
import { badRequest, conflict, notFound } from '@/server/errors'
import { getDoc, newId, queryCollection, setDoc } from '@/server/repositories/firestore-repo'
import type { StaffCreateInput } from '@/server/validators/school'
import type { SchoolClass, Staff, StaffLoginCredential } from '@/types'

export type StaffDto = Staff

/** Admin-only credential sheet row (includes issued temporary password). */
export type StaffCredentialDto = StaffLoginCredential & {
  hasAuthAccount: boolean
}

function generateTemporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = randomBytes(10)
  let out = ''
  for (let i = 0; i < bytes.length; i += 1) {
    out += alphabet[bytes[i]! % alphabet.length]
  }
  return `${out}!`
}

/** Keep staff.classIds in sync with classes where they are class teacher. */
export async function syncStaffClassIdsFromClasses(staffId?: string): Promise<void> {
  const classes = await queryCollection<SchoolClass>('classes', { limit: 200 })
  const byTeacher = new Map<string, string[]>()
  for (const cls of classes) {
    if ((cls.status ?? 'ACTIVE') === 'ARCHIVED') continue
    const tid = cls.classTeacherId
    if (!tid) continue
    const list = byTeacher.get(tid) ?? []
    list.push(cls.id)
    byTeacher.set(tid, list)
  }

  const staffRows = staffId
    ? [await getDoc<Staff>('staff', staffId)].filter(Boolean) as Staff[]
    : await queryCollection<Staff>('staff', { limit: 200 })

  await Promise.all(
    staffRows.map(async (row) => {
      const nextIds = byTeacher.get(row.id) ?? []
      const prev = [...(row.classIds ?? [])].sort().join(',')
      const next = [...nextIds].sort().join(',')
      if (prev === next) return
      await setDoc('staff', row.id, { ...row, classIds: nextIds })
    }),
  )
}

export async function assignClassTeacher(
  classId: string,
  previousTeacherId: string | undefined,
  nextTeacherId: string | undefined,
): Promise<void> {
  if (previousTeacherId && previousTeacherId !== nextTeacherId) {
    const prev = await getDoc<Staff>('staff', previousTeacherId)
    if (prev) {
      await setDoc('staff', previousTeacherId, {
        ...prev,
        classIds: (prev.classIds ?? []).filter((id) => id !== classId),
      })
    }
  }
  if (nextTeacherId) {
    const next = await getDoc<Staff>('staff', nextTeacherId)
    if (next) {
      const ids = new Set(next.classIds ?? [])
      ids.add(classId)
      await setDoc('staff', nextTeacherId, { ...next, classIds: [...ids] })
    }
  }
}

export async function listStaff(session: SessionContext): Promise<StaffDto[]> {
  requirePermission(session, 'teachers.read')
  // Ensure class-teacher assignments show on staff profiles
  await syncStaffClassIdsFromClasses().catch(() => undefined)
  return queryCollection<Staff>('staff', { limit: 100 })
}

export async function getStaff(session: SessionContext, id: string): Promise<StaffDto> {
  requirePermission(session, 'teachers.read')
  await syncStaffClassIdsFromClasses(id).catch(() => undefined)
  const row = await getDoc<Staff>('staff', id)
  if (!row) throw notFound('Staff not found')
  return row
}

export async function createStaff(
  session: SessionContext,
  input: StaffCreateInput,
  requestId?: string,
): Promise<StaffDto> {
  requirePermission(session, 'teachers.manage')
  const password = input.password?.trim() || generateTemporaryPassword()
  if (password.length < 8) throw badRequest('Password must be at least 8 characters')
  const { password: _ignored, ...rest } = input
  const id = newId('st')
  const row: Staff = {
    ...rest,
    id,
    classIds: rest.classIds ?? [],
    subjectIds: rest.subjectIds ?? [],
  }

  let authUid: string
  try {
    const user = await getAdminAuth().createUser({
      email: input.email.toLowerCase(),
      password,
      displayName: `${input.firstName} ${input.lastName}`,
      emailVerified: false,
    })
    authUid = user.uid
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'auth/email-already-exists') throw conflict('Email already registered')
    throw err
  }

  await setDoc('staff', id, { ...row })
  await getAdminDb().collection('users').doc(authUid).set({
    id: authUid,
    name: `${input.firstName} ${input.lastName}`,
    email: input.email.toLowerCase(),
    role: 'TEACHER',
    staffId: id,
    title: input.title,
    department: input.department,
    employeeNumber: input.employeeNumber,
    preferredLanguage: 'en',
    timezone: 'Africa/Harare',
    notificationPrefs: { email: true, sms: false, inApp: true },
  })

  // Store admin-issued temporary password for the credentials sheet
  await setDoc('staffCredentials', id, {
    staffId: id,
    email: input.email.toLowerCase(),
    password,
    role: 'TEACHER',
    temporaryPassword: true,
    lastResetAt: new Date().toISOString().slice(0, 10),
    authUid,
  })

  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'staff.create',
    entityType: 'staff',
    entityId: id,
    requestId,
    metadata: { authUid },
  })

  return row
}

type StaffCredRow = StaffLoginCredential & { id: string; authUid?: string }

export async function listStaffCredentials(
  session: SessionContext,
): Promise<StaffCredentialDto[]> {
  requirePermission(session, 'teachers.manage')
  const rows = await queryCollection<StaffCredRow>('staffCredentials', { limit: 100 })
  return rows.map((row) => ({
    staffId: row.staffId || row.id,
    email: row.email,
    password: row.password || '',
    role: row.role,
    temporaryPassword: row.temporaryPassword ?? Boolean(row.password),
    lastResetAt: row.lastResetAt,
    hasAuthAccount: Boolean(row.authUid),
  }))
}

export async function resetStaffPassword(
  session: SessionContext,
  staffId: string,
  password: string | undefined,
  requestId?: string,
): Promise<StaffCredentialDto> {
  requirePermission(session, 'teachers.manage')
  const nextPassword = password?.trim() || generateTemporaryPassword()
  if (nextPassword.length < 8) throw badRequest('Password must be at least 8 characters')

  const cred = await getDoc<StaffCredRow>('staffCredentials', staffId)
  if (!cred?.authUid) throw notFound('Staff auth account not found')

  await getAdminAuth().updateUser(cred.authUid, { password: nextPassword })
  const lastResetAt = new Date().toISOString().slice(0, 10)
  await setDoc('staffCredentials', staffId, {
    staffId,
    email: cred.email,
    password: nextPassword,
    role: cred.role,
    temporaryPassword: true,
    lastResetAt,
    authUid: cred.authUid,
  })

  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'staff.password_reset',
    entityType: 'staff',
    entityId: staffId,
    requestId,
  })

  return {
    staffId,
    email: cred.email,
    password: nextPassword,
    role: cred.role,
    temporaryPassword: true,
    lastResetAt,
    hasAuthAccount: true,
  }
}

export const listStaffService = listStaff
export const createStaffService = createStaff
export const listStaffCredentialsService = listStaffCredentials
export const resetStaffPasswordService = resetStaffPassword

// Guardians lived here briefly — re-export for API routes that still import from staff-service
export {
  listGuardiansService,
  createGuardianService,
  updateGuardianService,
} from '@/server/services/guardians-service'
