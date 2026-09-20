/** VISTE student / admission number format: VHS-{enrollmentYear}-{001} */

const VHS_PATTERN = /^VHS-(\d{4})-(\d+)$/i

export function enrollmentYearFromDate(isoDate: string | undefined | null): number {
  if (!isoDate) return new Date().getFullYear()
  const parsed = Date.parse(isoDate)
  if (Number.isNaN(parsed)) return new Date().getFullYear()
  return new Date(parsed).getFullYear()
}

export function formatVhsNumber(year: number, sequence: number): string {
  return `VHS-${year}-${String(Math.max(1, sequence)).padStart(3, '0')}`
}

export function parseVhsSequence(value: string | undefined | null, year: number): number | null {
  if (!value) return null
  const match = value.trim().match(VHS_PATTERN)
  if (!match) return null
  if (Number(match[1]) !== year) return null
  const seq = Number(match[2])
  return Number.isFinite(seq) ? seq : null
}

/** Highest existing sequence for a year across student + admission numbers. */
export function maxVhsSequence(
  rows: { studentNumber?: string; admissionNumber?: string }[],
  year: number,
): number {
  let max = 0
  for (const row of rows) {
    for (const value of [row.studentNumber, row.admissionNumber]) {
      const seq = parseVhsSequence(value, year)
      if (seq != null) max = Math.max(max, seq)
    }
  }
  return max
}

export function previewNextVhsNumber(
  rows: { studentNumber?: string; admissionNumber?: string }[],
  admissionDate: string,
): string {
  const year = enrollmentYearFromDate(admissionDate)
  return formatVhsNumber(year, maxVhsSequence(rows, year) + 1)
}
