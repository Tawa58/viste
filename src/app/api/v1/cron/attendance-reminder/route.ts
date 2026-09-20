import { jsonOk, withApiHandler } from '@/server/http/handler'
import { forbidden } from '@/server/errors'
import { schoolHour, schoolToday } from '@/server/lib/school-time'
import { runMissingRegisterReminderService } from '@/server/services/notifications-service'

function assertCronAuthorized(request: Request) {
  // Vercel Cron invocations include this header
  if (request.headers.get('x-vercel-cron') === '1') return

  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
      throw forbidden('CRON_SECRET is not configured')
    }
    return
  }
  const auth = request.headers.get('authorization') ?? ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const url = new URL(request.url)
  const querySecret = url.searchParams.get('secret') ?? ''
  if (bearer !== secret && querySecret !== secret) {
    throw forbidden('Invalid cron credentials')
  }
}

/**
 * Vercel Cron (and manual) endpoint: after 08:00 school time, create one admin
 * notification listing classes whose daily register is still missing.
 */
async function handle(request: Request) {
  assertCronAuthorized(request)

  const force = new URL(request.url).searchParams.get('force') === '1'
  const hour = schoolHour()
  if (!force && hour < 8) {
    return jsonOk({
      skipped: true,
      reason: 'Before 08:00 school time',
      date: schoolToday(),
      hour,
    })
  }

  const result = await runMissingRegisterReminderService()
  return jsonOk({ skipped: false, ...result })
}

export const GET = withApiHandler(async (request) => handle(request))
export const POST = withApiHandler(async (request) => handle(request))
