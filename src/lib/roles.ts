import type { UserRole } from '@/types'

const SCHOOL_SETTINGS_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'PRINCIPAL',
]

const STAFF_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'PRINCIPAL',
  'TEACHER',
  'ACCOUNTANT',
  'FINANCE_OFFICER',
  'REGISTRAR',
  'RECEPTIONIST',
  'LIBRARIAN',
  'TRANSPORT_MANAGER',
]

/** Routes each role may open. `*` = full school console. */
export const ROLE_ROUTES: Record<UserRole, '*' | string[]> = {
  SUPER_ADMIN: '*',
  SCHOOL_ADMIN: '*',
  PRINCIPAL: '*',
  TEACHER: [
    '/dashboard',
    '/students',
    '/classes',
    '/subjects',
    '/sports',
    '/clubs',
    '/attendance',
    '/examinations',
    '/results',
    '/announcements',
    '/reports',
    '/settings',
  ],
  ACCOUNTANT: [
    '/dashboard',
    '/students',
    '/fees',
    '/parents',
    '/reports',
    '/announcements',
    '/settings',
  ],
  FINANCE_OFFICER: [
    '/dashboard',
    '/students',
    '/fees',
    '/parents',
    '/reports',
    '/announcements',
    '/settings',
  ],
  REGISTRAR: [
    '/dashboard',
    '/students',
    '/parents',
    '/classes',
    '/subjects',
    '/sports',
    '/clubs',
    '/attendance',
    '/announcements',
    '/reports',
    '/settings',
  ],
  RECEPTIONIST: [
    '/dashboard',
    '/students',
    '/parents',
    '/announcements',
    '/settings',
  ],
  LIBRARIAN: ['/dashboard', '/library', '/students', '/announcements', '/settings'],
  TRANSPORT_MANAGER: ['/dashboard', '/transport', '/students', '/announcements', '/settings'],
  PARENT: [
    '/dashboard',
    '/students',
    '/fees',
    '/attendance',
    '/results',
    '/announcements',
    '/settings',
  ],
  STUDENT: [
    '/dashboard',
    '/attendance',
    '/results',
    '/fees',
    '/announcements',
    '/settings',
  ],
}

export function isStaffRole(role: UserRole) {
  return STAFF_ROLES.includes(role)
}

export function canManageSchoolSettings(role: UserRole) {
  return SCHOOL_SETTINGS_ROLES.includes(role)
}

/** Admin-level student registration, guardian edits, and full profile control. */
export function canManageStudents(role: UserRole) {
  return (
    role === 'SUPER_ADMIN' ||
    role === 'SCHOOL_ADMIN' ||
    role === 'PRINCIPAL' ||
    role === 'REGISTRAR'
  )
}

/** Create/edit/archive classes and manage class membership. */
export function canManageClasses(role: UserRole) {
  return canManageStudents(role)
}

/** Manage subjects, sports, clubs, and houses. */
export function canManageAcademics(role: UserRole) {
  return canManageStudents(role)
}

/** Teachers may update limited contact fields only. */
export function canEditStudentLimited(role: UserRole) {
  return role === 'TEACHER' || canManageStudents(role)
}

export function canViewStaffCredentials(role: UserRole) {
  return role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN' || role === 'PRINCIPAL'
}

export function hasFullConsoleAccess(role: UserRole) {
  return ROLE_ROUTES[role] === '*'
}

export function canAccessPath(role: UserRole, pathname: string) {
  const allowed = ROLE_ROUTES[role]
  if (allowed === '*') return true
  return allowed.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

export function formatRoleLabel(role: UserRole) {
  return role.replaceAll('_', ' ')
}

export function defaultTitleForRole(role: UserRole) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Administrator'
    case 'SCHOOL_ADMIN':
      return 'School Administrator'
    case 'PRINCIPAL':
      return 'Principal'
    case 'TEACHER':
      return 'Teacher'
    case 'ACCOUNTANT':
      return 'Accountant'
    case 'FINANCE_OFFICER':
      return 'Finance Officer'
    case 'REGISTRAR':
      return 'Registrar'
    case 'RECEPTIONIST':
      return 'Receptionist'
    case 'LIBRARIAN':
      return 'Librarian'
    case 'TRANSPORT_MANAGER':
      return 'Transport Manager'
    case 'PARENT':
      return 'Parent / Guardian'
    case 'STUDENT':
      return 'Student'
    default:
      return formatRoleLabel(role)
  }
}
