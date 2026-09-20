import { NextResponse } from 'next/server'

/**
 * Lightweight liveness probe — avoid heavy Admin SDK import so the route
 * still answers even when Firebase Admin env is missing/misconfigured.
 */
export async function GET() {
  let adminConfigured = false
  try {
    const { isAdminConfigured } = await import('@/lib/firebase/admin')
    adminConfigured = isAdminConfigured()
  } catch {
    adminConfigured = false
  }

  return NextResponse.json({
    data: {
      ok: true,
      service: 'viste-mgt-api',
      adminConfigured,
      time: new Date().toISOString(),
    },
  })
}
