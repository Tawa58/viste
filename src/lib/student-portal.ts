/**
 * Student portal sign-in: students log in with their student number and an
 * admin-issued monthly code. Each student number maps to a hidden Firebase
 * Auth email so the normal email/password flow can be reused.
 */

export const STUDENT_PORTAL_EMAIL_DOMAIN = 'students.viste-sms.app'

/** School timezone offset (Africa/Harare, no DST). */
const SCHOOL_UTC_OFFSET_HOURS = 2

/** Anything without an `@` on the login form is treated as a student number. */
export function isStudentNumberIdentifier(identifier: string): boolean {
  const value = identifier.trim()
  return value.length > 0 && !value.includes('@')
}

export function normalizeStudentNumber(studentNumber: string): string {
  return studentNumber.trim().toUpperCase()
}

export function studentPortalEmail(studentNumber: string): string {
  const local = studentNumber
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  return `${local || 'student'}@${STUDENT_PORTAL_EMAIL_DOMAIN}`
}

export function isStudentPortalEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${STUDENT_PORTAL_EMAIL_DOMAIN}`)
}

/** `YYYY-MM` for the current school month. */
export function currentPortalMonth(now = new Date()): string {
  const local = new Date(now.getTime() + SCHOOL_UTC_OFFSET_HOURS * 3_600_000)
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`
}

/** ISO instant when a code issued in `month` stops working (start of next school month). */
export function portalMonthExpiry(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const nextMonthStartUtc = Date.UTC(y!, m!, 1) - SCHOOL_UTC_OFFSET_HOURS * 3_600_000
  return new Date(nextMonthStartUtc).toISOString()
}

export function formatPortalMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
}
