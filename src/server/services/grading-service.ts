import 'server-only'

import type { SessionContext } from '@/server/auth/session'
import { requirePermission } from '@/server/authorization/permissions'
import { badRequest } from '@/server/errors'
import { getDoc, setDoc } from '@/server/repositories/firestore-repo'
import type { GradeBand, GradingScale } from '@/types'

export const DEFAULT_GRADING_SCALE: GradingScale = {
  id: 'default',
  passMark: 50,
  bands: [
    { grade: 'A', minPercent: 85, maxPercent: 100 },
    { grade: 'B', minPercent: 70, maxPercent: 84 },
    { grade: 'C', minPercent: 60, maxPercent: 69 },
    { grade: 'D', minPercent: 50, maxPercent: 59 },
    { grade: 'E', minPercent: 40, maxPercent: 49 },
    { grade: 'U', minPercent: 0, maxPercent: 39 },
  ],
}

function validateBands(bands: GradeBand[]) {
  if (!bands.length) throw badRequest('At least one grade band is required')
  const sorted = [...bands].sort((a, b) => b.minPercent - a.minPercent)
  for (const b of sorted) {
    if (b.minPercent < 0 || b.maxPercent > 100 || b.minPercent > b.maxPercent) {
      throw badRequest(`Invalid band ${b.grade}: min/max must be within 0–100`)
    }
    if (!b.grade.trim()) throw badRequest('Grade label is required')
  }
  return sorted
}

export async function getGradingScale(): Promise<GradingScale> {
  const row = await getDoc<GradingScale>('settings', 'gradingScale')
  if (!row?.bands?.length) return { ...DEFAULT_GRADING_SCALE }
  return {
    id: 'default',
    passMark: row.passMark ?? 50,
    bands: row.bands,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  }
}

export async function getGradingScaleService(session: SessionContext): Promise<GradingScale> {
  requirePermission(session, 'results.read')
  return getGradingScale()
}

export async function updateGradingScaleService(
  session: SessionContext,
  input: { passMark: number; bands: GradeBand[] },
): Promise<GradingScale> {
  requirePermission(session, 'settings.manage')
  const bands = validateBands(input.bands)
  if (input.passMark < 0 || input.passMark > 100) {
    throw badRequest('Pass mark must be between 0 and 100')
  }
  const row: GradingScale = {
    id: 'default',
    passMark: input.passMark,
    bands,
    updatedAt: new Date().toISOString(),
    updatedBy: session.uid,
  }
  await setDoc('settings', 'gradingScale', { ...row })
  return row
}

/** Map a raw score to a letter grade using percent of maxScore. */
export function gradeFromScore(
  score: number,
  maxScore: number,
  scale: GradingScale,
): string {
  if (maxScore <= 0) return scale.bands[scale.bands.length - 1]?.grade ?? 'U'
  const pct = Math.max(0, Math.min(100, (score / maxScore) * 100))
  const bands = [...scale.bands].sort((a, b) => b.minPercent - a.minPercent)
  for (const band of bands) {
    if (pct >= band.minPercent && pct <= band.maxPercent) return band.grade
  }
  // Edge: 100.0 rounding — prefer highest band
  if (pct >= 99.5 && bands[0]) return bands[0].grade
  return bands[bands.length - 1]?.grade ?? 'U'
}
