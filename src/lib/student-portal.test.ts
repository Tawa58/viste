import { describe, expect, it } from 'vitest'
import {
  currentPortalMonth,
  isStudentNumberIdentifier,
  portalMonthExpiry,
  studentPortalEmail,
} from '@/lib/student-portal'

describe('student portal helpers', () => {
  it('treats identifiers without @ as student numbers', () => {
    expect(isStudentNumberIdentifier('VHS-2026-001')).toBe(true)
    expect(isStudentNumberIdentifier('teacher@viste.school')).toBe(false)
    expect(isStudentNumberIdentifier('   ')).toBe(false)
  })

  it('maps student numbers to a stable login email regardless of case/spacing', () => {
    expect(studentPortalEmail(' VHS-2026-001 ')).toBe('vhs-2026-001@students.viste-sms.app')
    expect(studentPortalEmail('vhs-2026-001')).toBe(studentPortalEmail('VHS-2026-001'))
    expect(studentPortalEmail('VHS/2026 01')).toBe('vhs-2026-01@students.viste-sms.app')
  })

  it('uses the Harare calendar month', () => {
    // 23:30 UTC on 30 Sep is already 1 Oct in Harare (UTC+2)
    expect(currentPortalMonth(new Date('2026-09-30T23:30:00Z'))).toBe('2026-10')
    expect(currentPortalMonth(new Date('2026-09-30T20:00:00Z'))).toBe('2026-09')
  })

  it('expires codes at midnight Harare at the start of next month', () => {
    expect(portalMonthExpiry('2026-09')).toBe('2026-09-30T22:00:00.000Z')
    expect(portalMonthExpiry('2026-12')).toBe('2026-12-31T22:00:00.000Z')
  })
})
