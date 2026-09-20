import type { UserRole } from '@/types'

/** Canonical permission strings — enforced server-side only. */
export const PERMISSIONS = [
  'students.read',
  'students.create',
  'students.update',
  'students.archive',
  'parents.read',
  'parents.manage',
  'teachers.read',
  'teachers.manage',
  'staff.read',
  'staff.manage',
  'classes.read',
  'classes.manage',
  'subjects.read',
  'subjects.manage',
  'attendance.read',
  'attendance.create',
  'attendance.update',
  'fees.read',
  'fees.create',
  'fees.update',
  'payments.read',
  'payments.create',
  'payments.reverse',
  'results.read',
  'results.enter',
  'results.update',
  'results.approve',
  'results.publish',
  'results.lock',
  'users.manage',
  'roles.manage',
  'settings.manage',
  'audit.read',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const ALL: Permission[] = [...PERMISSIONS]

const FINANCE: Permission[] = [
  'students.read',
  'parents.read',
  'fees.read',
  'fees.create',
  'fees.update',
  'payments.read',
  'payments.create',
  'payments.reverse',
]

const TEACHER: Permission[] = [
  'students.read',
  'students.update',
  'classes.read',
  'subjects.read',
  'attendance.read',
  'attendance.create',
  'attendance.update',
  'results.read',
  'results.enter',
  'results.update',
]

const PARENT: Permission[] = [
  'students.read',
  'parents.read',
  'fees.read',
  'payments.read',
  'attendance.read',
  'results.read',
]

const STUDENT: Permission[] = [
  'students.read',
  'attendance.read',
  'results.read',
  'fees.read',
  'payments.read',
]

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  SUPER_ADMIN: ALL,
  SCHOOL_ADMIN: ALL,
  PRINCIPAL: ALL.filter((p) => p !== 'roles.manage'),
  TEACHER,
  ACCOUNTANT: FINANCE,
  FINANCE_OFFICER: FINANCE,
  REGISTRAR: [
    'students.read',
    'students.create',
    'students.update',
    'students.archive',
    'parents.read',
    'parents.manage',
    'teachers.read',
    'staff.read',
    'classes.read',
    'subjects.read',
    'attendance.read',
    'attendance.create',
    'attendance.update',
  ],
  RECEPTIONIST: ['students.read', 'parents.read'],
  LIBRARIAN: ['students.read'],
  TRANSPORT_MANAGER: ['students.read'],
  PARENT,
  STUDENT,
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function listPermissions(role: UserRole): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? [])]
}
