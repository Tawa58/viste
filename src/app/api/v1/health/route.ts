import { isAdminConfigured } from '@/lib/firebase/admin'

export async function GET() {
  return Response.json({
    data: {
      ok: true,
      service: 'viste-mgt-api',
      adminConfigured: isAdminConfigured(),
      time: new Date().toISOString(),
    },
  })
}
