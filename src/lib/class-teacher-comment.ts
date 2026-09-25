import type { ClassResultsPeriod, ClassResultsSubjectScore } from '@/types'

type Band = {
  min: number
  openings: string[]
  closing: string
}

const BANDS: Band[] = [
  {
    min: 80,
    openings: [
      '{name} has produced excellent results {period}',
      '{name} has done exceptionally well {period}',
    ],
    closing: 'Keep up this outstanding standard.',
  },
  {
    min: 70,
    openings: [
      '{name} has shown very good performance {period}',
      '{name} has worked very well {period}',
    ],
    closing: 'With continued effort, even higher grades are within reach.',
  },
  {
    min: 60,
    openings: ['{name} has produced good results {period}', '{name} has done well {period}'],
    closing: 'More consistent revision will lift the overall grade.',
  },
  {
    min: 50,
    openings: [
      '{name} has made satisfactory progress {period}',
      '{name} has shown fair performance {period}',
    ],
    closing: 'Greater effort and regular revision are needed to improve.',
  },
  {
    min: 40,
    openings: [
      "{name}'s performance {period} is below the expected standard",
      '{name} has struggled {period}',
    ],
    closing: 'Extra work, support from subject teachers and regular revision are strongly advised.',
  },
  {
    min: 0,
    openings: [
      "{name}'s results {period} are unsatisfactory",
      '{name} has performed poorly {period}',
    ],
    closing: 'Immediate improvement is required; please work closely with teachers and parents.',
  },
]

function pick<T>(items: T[], seed: string): T {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return items[Math.abs(h) % items.length]
}

/**
 * Builds a class teacher remark from a student's results.
 * Returns an empty string when there are no results to comment on.
 */
export function generateClassTeacherComment(opts: {
  firstName: string
  average: number | null
  subjects: ClassResultsSubjectScore[]
  period: ClassResultsPeriod
  seed?: string
}): string {
  if (opts.average === null || opts.subjects.length === 0) return ''
  const band = BANDS.find((b) => opts.average! >= b.min) ?? BANDS[BANDS.length - 1]
  const period = opts.period === 'MONTH' ? 'this month' : 'this term'
  const opening = pick(band.openings, opts.seed ?? opts.firstName)
    .replace('{name}', opts.firstName)
    .replace('{period}', period)

  const parts = [`${opening}, with an average of ${Math.round(opts.average)}%.`]

  if (opts.subjects.length > 1) {
    const sorted = [...opts.subjects].sort((a, b) => b.percent - a.percent)
    const best = sorted[0]
    const weakest = sorted[sorted.length - 1]
    if (best.percent >= 60) parts.push(`Strongest subject: ${best.subjectName}.`)
    if (weakest.percent < 50 && weakest.subjectId !== best.subjectId) {
      parts.push(`More attention is needed in ${weakest.subjectName}.`)
    }
  }

  parts.push(band.closing)
  return parts.join(' ')
}
