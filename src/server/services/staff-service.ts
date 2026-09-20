import 'server-only'

import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import { writeAuditLog } from '@/server/audit/logger'
import type { SessionContext } from '@/server/auth/session'
import { requirePermission } from '@/server/authorization/permissions'
import { badRequest, conflict, notFound } from '@/server/errors'
import { getDoc, newId, queryCollection, setDoc } from '@/server/repositories/firestore-repo'
import type { StaffCreateInput } from '@/server/validators/school'
import type { Staff, StaffLoginCredential } from '@/types'

export type StaffDto = Staff

export type StaffCredentialDto = Omit<StaffLoginCredential, 'password'> & {
  hasAuthAccount: boolean
}

function stripPassword<T extends { password?: string }>(row: T): Omit<T, 'password'> {
  const { password: _p, ...rest } = row
  return rest
}

export async function listStaff(session: SessionContext): Promise<StaffDto[]> {
  requirePermission(session, 'teachers.read')
  return queryCollection<Staff>('staff', { limit: 100 })
}

export async function getStaff(session: SessionContext, id: string): Promise<StaffDto> {
  requirePermission(session, 'teachers.read')
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
  const { password, ...rest } = input
  const id = newId('st')
  const row: Staff = { ...rest, id }

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

  // Metadata only — never store plaintext password
  await setDoc('staffCredentials', id, {
    staffId: id,
    email: input.email.toLowerCase(),
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
    ...stripPassword(row),
    staffId: row.staffId || row.id,
    hasAuthAccount: Boolean(row.authUid),
  }))
}

export async function resetStaffPassword(
  session: SessionContext,
  staffId: string,
  password: string,
  requestId?: string,
): Promise<StaffCredentialDto> {
  requirePermission(session, 'teachers.manage')
  if (password.length < 8) throw badRequest('Password must be at least 8 characters')

  const cred = await getDoc<StaffCredRow>('staffCredentials', staffId)
  if (!cred?.authUid) throw notFound('Staff auth account not found')

  await getAdminAuth().updateUser(cred.authUid, { password })
  await setDoc('staffCredentials', staffId, {
    ...stripPassword(cred),
    temporaryPassword: true,
    lastResetAt: new Date().toISOString().slice(0, 10),
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
    role: cred.role,
    temporaryPassword: true,
    lastResetAt: new Date().toISOString().slice(0, 10),
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
