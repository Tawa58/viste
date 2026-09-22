import type { StaffCategory } from '@/types'

export const STAFF_CATEGORIES: {
  value: StaffCategory
  label: string
}[] = [
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'COACH', label: 'Sports coach' },
  { value: 'SPORTS_OFFICIAL', label: 'Sports official / leadership' },
  { value: 'MEDIC', label: 'Medic / first aider' },
  { value: 'ADMINISTRATION', label: 'Administration' },
  { value: 'SUPPORT_STAFF', label: 'Support staff' },
  { value: 'ACCOUNTANT', label: 'Accounts / finance' },
  { value: 'LIBRARIAN', label: 'Librarian' },
  { value: 'OTHER', label: 'Other' },
]

export function staffCategoryLabel(category?: StaffCategory | null): string {
  if (!category) return 'Teacher'
  return STAFF_CATEGORIES.find((c) => c.value === category)?.label ?? category
}

export function normalizeStaffCategory(value: unknown): StaffCategory {
  if (
    typeof value === 'string' &&
    STAFF_CATEGORIES.some((c) => c.value === value)
  ) {
    return value as StaffCategory
  }
  return 'TEACHER'
}
