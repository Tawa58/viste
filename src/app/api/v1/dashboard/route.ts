import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { getDashboardBundle } from '@/server/services/catalog-service'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  const { stats, recentPayments } = await getDashboardBundle(session)
  return jsonOk({
    stats,
    enrollment: [{ month: 'Now', students: stats.totalStudents }],
    attendanceOverview: [
      { name: 'Attendance %', value: stats.todayAttendancePct },
      { name: 'Remainder', value: Math.max(0, 100 - stats.todayAttendancePct) },
    ],
    feeCollection: [
      {
        month: 'YTD',
        collected: stats.feesCollected,
        outstanding: stats.outstandingFees,
      },
    ],
    performance: [],
    recentPayments,
    recentActivities: [
      {
        id: 'act-dashboard',
        title: 'Dashboard',
        detail: 'Aggregated via Admin API',
        at: new Date().toISOString(),
      },
    ],
  })
})
