import { describe, expect, it } from 'vitest'
import { hasPermission, ROLE_PERMISSIONS } from '@/server/authorization/rbac-map'

describe('RBAC permissions', () => {
  it('denies student payment create', () => {
    expect(hasPermission('STUDENT', 'payments.create')).toBe(false)
  })

  it('allows finance payment create', () => {
    expect(hasPermission('ACCOUNTANT', 'payments.create')).toBe(true)
    expect(hasPermission('FINANCE_OFFICER', 'payments.reverse')).toBe(true)
  })

  it('allows admin result publish/lock', () => {
    expect(hasPermission('SCHOOL_ADMIN', 'results.publish')).toBe(true)
    expect(hasPermission('SCHOOL_ADMIN', 'results.lock')).toBe(true)
    expect(hasPermission('TEACHER', 'results.publish')).toBe(false)
  })

  it('teachers can enter but not approve', () => {
    expect(hasPermission('TEACHER', 'results.enter')).toBe(true)
    expect(hasPermission('TEACHER', 'results.approve')).toBe(false)
  })

  it('resolves teacher grant/deny overrides', async () => {
    const { resolveEffectivePermissions, overridesFromTeacherSelection } = await import(
      '@/server/authorization/rbac-map'
    )
    const overrides = overridesFromTeacherSelection([
      'students.read',
      'classes.read',
      'fees.read',
    ])
    expect(overrides.grant).toContain('fees.read')
    expect(overrides.deny).toContain('attendance.read')
    const effective = resolveEffectivePermissions('TEACHER', overrides)
    expect(effective).toContain('fees.read')
    expect(effective).not.toContain('attendance.create')
  })

  it('every role has a permission list', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS)) {
      expect(ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS].length).toBeGreaterThan(0)
    }
  })
})
