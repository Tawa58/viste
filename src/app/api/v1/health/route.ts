import { NextResponse } from 'next/server'

/**
 * Lightweight liveness probe.
 * Includes a safe admin diagnostic (no secret values) to debug Vercel env wiring.
 */
export async function GET() {
  let adminConfigured = false
  let adminHint: string | null = null

  try {
    const project = Boolean(
      process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    )
    const email = Boolean(process.env.FIREBASE_ADMIN_CLIENT_EMAIL)
    const keyLen = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length ?? 0

    const { isAdminConfigured } = await import('@/lib/firebase/admin')
    adminConfigured = isAdminConfigured()
    adminHint = adminConfigured
      ? 'ok'
      : `env project=${project ? 'yes' : 'no'} email=${email ? 'yes' : 'no'} keyLen=${keyLen}`
  } catch (err) {
    adminConfigured = false
    adminHint = err instanceof Error ? `import:${err.message.slice(0, 160)}` : 'import:failed'
  }

  return NextResponse.json({
    data: {
      ok: true,
      service: 'viste-mgt-api',
      adminConfigured,
      adminHint,
      time: new Date().toISOString(),
    },
  })
}
