import 'server-only'

/** Default school timezone (Zimbabwe / CAT, no DST). Override with SCHOOL_TIMEZONE. */
export function schoolTimeZone(): string {
  return process.env.SCHOOL_TIMEZONE?.trim() || 'Africa/Harare'
}

/** Today's calendar date in school timezone as YYYY-MM-DD. */
export function schoolToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: schoolTimeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Hour (0–23) in school timezone. */
export function schoolHour(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: schoolTimeZone(),
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now)
  const hour = parts.find((p) => p.type === 'hour')?.value
  return Number(hour ?? '0')
}
