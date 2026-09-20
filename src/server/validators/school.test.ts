import { describe, expect, it } from 'vitest'
import { paymentCreateSchema, studentCreateSchema } from '@/server/validators/school'

describe('validators', () => {
  it('rejects negative payment amounts', () => {
    const parsed = paymentCreateSchema.safeParse({
      studentId: 'stu_1',
      invoiceId: 'inv_1',
      amount: -10,
      method: 'Cash',
      receiptNumber: 'R1',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts valid student create', () => {
    const parsed = studentCreateSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      dateOfBirth: '2008-01-01',
      gender: 'Female',
      address: 'Harare',
      admissionDate: '2025-01-01',
      classId: 'cls-f1',
      streamId: 'str-1a',
    })
    expect(parsed.success).toBe(true)
  })

  it('accepts blank numbers for auto-assignment', () => {
    const parsed = studentCreateSchema.safeParse({
      studentNumber: '',
      admissionNumber: '',
      firstName: 'Ada',
      lastName: 'Lovelace',
      dateOfBirth: '2008-01-01',
      gender: 'Female',
      address: 'Harare',
      admissionDate: '2026-01-15',
      classId: 'cls_f1',
    })
    expect(parsed.success).toBe(true)
  })
})
