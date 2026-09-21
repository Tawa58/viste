import 'server-only'

import { getAdminDb } from '@/lib/firebase/admin'
import { getDoc, queryCollection, setDoc } from '@/server/repositories/firestore-repo'
import type { AcademicYear, Term } from '@/types'

export type AcademicCalendar = {
  year: AcademicYear
  terms: [Term, Term, Term]
}

/** Southern-hemisphere style school year spanning Sep–Aug (e.g. 2025/2026). */
export function currentAcademicYearBounds(now = new Date()) {
  const month = now.getMonth() // 0-based
  const calendarYear = now.getFullYear()
  // Sep (8) onwards → year starts this calendar year; else previous
  const startYear = month >= 8 ? calendarYear : calendarYear - 1
  const endYear = startYear + 1
  const id = `ay-${startYear}`
  return {
    id,
    name: `${startYear}/${endYear}`,
    startDate: `${startYear}-09-01`,
    endDate: `${endYear}-07-31`,
    startYear,
    endYear,
  }
}

function defaultTermsForYear(year: AcademicYear): [Term, Term, Term] {
  const startYear = Number(year.id.replace('ay-', '')) || new Date().getFullYear()
  const endYear = startYear + 1
  return [
    {
      id: `term-${startYear}-1`,
      academicYearId: year.id,
      name: 'Term 1',
      sequence: 1,
      startDate: `${startYear}-09-01`,
      endDate: `${startYear}-12-12`,
    },
    {
      id: `term-${startYear}-2`,
      academicYearId: year.id,
      name: 'Term 2',
      sequence: 2,
      startDate: `${endYear}-01-12`,
      endDate: `${endYear}-04-03`,
    },
    {
      id: `term-${startYear}-3`,
      academicYearId: year.id,
      name: 'Term 3',
      sequence: 3,
      startDate: `${endYear}-04-20`,
      endDate: `${endYear}-07-17`,
    },
  ]
}

/**
 * Ensures the current academic year and Term 1/2/3 exist in Firestore.
 * Marks the computed year as current and others as not current.
 */
export async function ensureCurrentAcademicCalendar(): Promise<AcademicCalendar> {
  const bounds = currentAcademicYearBounds()
  const db = getAdminDb()

  let year = await getDoc<AcademicYear>('academicYears', bounds.id)
  if (!year) {
    year = {
      id: bounds.id,
      name: bounds.name,
      startDate: bounds.startDate,
      endDate: bounds.endDate,
      isCurrent: true,
    }
    await setDoc('academicYears', year.id, { ...year })
  } else if (!year.isCurrent) {
    year = { ...year, isCurrent: true }
    await setDoc('academicYears', year.id, { ...year })
  }

  // Demote other current years
  const allYears = await queryCollection<AcademicYear>('academicYears', { limit: 100 })
  for (const y of allYears) {
    if (y.id !== year.id && y.isCurrent) {
      await setDoc('academicYears', y.id, { ...y, isCurrent: false })
    }
  }

  const defaults = defaultTermsForYear(year)
  const terms: Term[] = []
  for (const def of defaults) {
    const existing = await getDoc<Term>('terms', def.id)
    if (existing) {
      terms.push(existing)
    } else {
      // Also match legacy terms for this year by sequence/name
      const legacy = (await queryCollection<Term>('terms', { limit: 100 })).find(
        (t) =>
          t.academicYearId === year!.id &&
          (t.sequence === def.sequence || t.name === def.name),
      )
      if (legacy) {
        terms.push(legacy)
      } else {
        await setDoc('terms', def.id, { ...def })
        terms.push(def)
      }
    }
  }

  // Keep a denormalized pointer for quick reads
  await db.collection('settings').doc('academicCalendar').set(
    {
      currentAcademicYearId: year.id,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  )

  const ordered = [1, 2, 3].map((seq) => {
    const t = terms.find((x) => x.sequence === seq) ?? defaults[seq - 1]
    return t
  }) as [Term, Term, Term]

  return { year, terms: ordered }
}

export type AcademicSettingsDto = {
  year: AcademicYear
  terms: Term[]
  years: AcademicYear[]
}

export async function getAcademicSettingsService(
  session: import('@/server/auth/session').SessionContext,
): Promise<AcademicSettingsDto> {
  const { requirePermission } = await import('@/server/authorization/permissions')
  requirePermission(session, 'settings.manage')
  const calendar = await ensureCurrentAcademicCalendar()
  const years = await queryCollection<AcademicYear>('academicYears', { limit: 100 })
  return {
    year: calendar.year,
    terms: [...calendar.terms],
    years: years.sort((a, b) => b.startDate.localeCompare(a.startDate)),
  }
}

export async function updateAcademicSettingsService(
  session: import('@/server/auth/session').SessionContext,
  input: {
    year: { id: string; name: string; startDate: string; endDate: string; isCurrent: boolean }
    terms: { id: string; name: string; sequence: number; startDate: string; endDate: string }[]
  },
): Promise<AcademicSettingsDto> {
  const { requirePermission } = await import('@/server/authorization/permissions')
  const { badRequest } = await import('@/server/errors')
  requirePermission(session, 'settings.manage')

  if (!input.year.id || !input.year.name.trim()) throw badRequest('Academic year name is required')
  if (!input.terms.length) throw badRequest('At least one term is required')

  const year: AcademicYear = {
    id: input.year.id,
    name: input.year.name.trim(),
    startDate: input.year.startDate,
    endDate: input.year.endDate,
    isCurrent: Boolean(input.year.isCurrent),
  }

  if (year.isCurrent) {
    const allYears = await queryCollection<AcademicYear>('academicYears', { limit: 100 })
    for (const y of allYears) {
      if (y.id !== year.id && y.isCurrent) {
        await setDoc('academicYears', y.id, { ...y, isCurrent: false })
      }
    }
  }

  await setDoc('academicYears', year.id, { ...year })

  const terms: Term[] = []
  for (const t of input.terms) {
    const row: Term = {
      id: t.id,
      academicYearId: year.id,
      name: t.name.trim() || `Term ${t.sequence}`,
      sequence: t.sequence,
      startDate: t.startDate,
      endDate: t.endDate,
    }
    await setDoc('terms', row.id, { ...row })
    terms.push(row)
  }

  await getAdminDb().collection('settings').doc('academicCalendar').set(
    {
      ...(year.isCurrent ? { currentAcademicYearId: year.id } : {}),
      updatedAt: new Date().toISOString(),
      updatedBy: session.uid,
    },
    { merge: true },
  )

  const years = await queryCollection<AcademicYear>('academicYears', { limit: 100 })
  return {
    year,
    terms: terms.sort((a, b) => a.sequence - b.sequence),
    years: years.sort((a, b) => b.startDate.localeCompare(a.startDate)),
  }
}

export async function resolveTermForSequence(
  academicYearId: string,
  sequence: 1 | 2 | 3,
): Promise<Term> {
  const calendar = await ensureCurrentAcademicCalendar()
  if (calendar.year.id === academicYearId) {
    return calendar.terms[sequence - 1]
  }

  const year =
    (await getDoc<AcademicYear>('academicYears', academicYearId)) ?? calendar.year
  const defaults = defaultTermsForYear(year)
  const def = defaults[sequence - 1]
  const existing = await getDoc<Term>('terms', def.id)
  if (existing) return existing
  await setDoc('terms', def.id, { ...def })
  return def
}
