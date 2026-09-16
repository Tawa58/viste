import { demoCredentials } from '@/mocks/data'
import type {
  Announcement,
  AppUser,
  Assessment,
  AttendanceRecord,
  AuditLog,
  AuthUser,
  DashboardStats,
  Examination,
  FeeStructure,
  Guardian,
  InventoryItem,
  Invoice,
  LibraryBook,
  LibraryLoan,
  Mark,
  Payment,
  ResultPortalView,
  RolePermission,
  SchoolClass,
  Staff,
  Stream,
  Student,
  Subject,
  Term,
  AcademicYear,
  TransportRoute,
} from '@/types'
import type { AuthService, DashboardService, StudentService } from './contracts'
import { apiRequest, clearAccessToken, setAccessToken } from './http'

type LoginApiResponse = {
  accessToken: string
  tokenType: string
  user: AuthUser
}

export class HttpAuthService implements AuthService {
  async login(email: string, password: string, remember = true) {
    const result = await apiRequest<LoginApiResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    })
    setAccessToken(result.accessToken, remember)
    return result.user
  }

  async logout() {
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST' })
    } finally {
      clearAccessToken()
    }
  }

  getDemoCredentials() {
    return demoCredentials
  }

  async updateProfile(_userId: string, patch: Partial<AuthUser>) {
    return apiRequest<AuthUser>('/auth/profile', {
      method: 'PATCH',
      body: patch,
    })
  }
}

export class HttpStudentService implements StudentService {
  list() {
    return apiRequest<Student[]>('/students')
  }
  getById(id: string) {
    return apiRequest<Student>(`/students/${id}`)
  }
}

export class HttpDashboardService implements DashboardService {
  getStats() {
    return apiRequest<DashboardStats>('/dashboard/stats')
  }
  getEnrollmentTrend() {
    return apiRequest<{ month: string; students: number }[]>('/dashboard/enrollment')
  }
  getAttendanceOverview() {
    return apiRequest<{ name: string; value: number }[]>('/dashboard/attendance-overview')
  }
  getFeeCollection() {
    return apiRequest<{ month: string; collected: number; outstanding: number }[]>(
      '/dashboard/fee-collection',
    )
  }
  getPerformance() {
    return apiRequest<{ subject: string; average: number }[]>('/dashboard/performance')
  }
  getRecentPayments() {
    return apiRequest<Payment[]>('/dashboard/recent-payments')
  }
  getRecentActivities() {
    return apiRequest<{ id: string; title: string; detail: string; at: string }[]>(
      '/dashboard/recent-activities',
    )
  }
}

export const httpCatalogService = {
  getYears: (): Promise<AcademicYear[]> => apiRequest('/catalog/years'),
  getTerms: (): Promise<Term[]> => apiRequest('/catalog/terms'),
  getClasses: (): Promise<SchoolClass[]> => apiRequest('/catalog/classes'),
  getStreams: (): Promise<Stream[]> => apiRequest('/catalog/streams'),
  getSubjects: (): Promise<Subject[]> => apiRequest('/catalog/subjects'),
  getStaff: (): Promise<Staff[]> => apiRequest('/staff'),
  getGuardians: (): Promise<Guardian[]> => apiRequest('/catalog/guardians'),
  getGuardian: (id: string) => apiRequest<Guardian | undefined>(`/catalog/guardians/${id}`),
  getStaffMember: (id: string) => apiRequest<Staff>(`/staff/${id}`),
  updateStaffPhoto(id: string, photoUrl: string | undefined) {
    return apiRequest<Staff>(`/staff/${id}/photo`, {
      method: 'PATCH',
      body: { photoUrl: photoUrl ?? null },
    })
  },
  createStaff(input: Omit<Staff, 'id'>) {
    return apiRequest<Staff>('/staff', { method: 'POST', body: input })
  },
  getAttendance: (): Promise<AttendanceRecord[]> => apiRequest('/catalog/attendance'),
  getExaminations: (): Promise<Examination[]> => apiRequest('/catalog/examinations'),
  getAssessments: (): Promise<Assessment[]> => apiRequest('/catalog/assessments'),
  getMarks: (): Promise<Mark[]> => apiRequest('/catalog/marks'),
  getFeeStructures: (): Promise<FeeStructure[]> => apiRequest('/catalog/fee-structures'),
  getInvoices: (): Promise<Invoice[]> => apiRequest('/catalog/invoices'),
  getPayments: (): Promise<Payment[]> => apiRequest('/catalog/payments'),
  getAnnouncements: (): Promise<Announcement[]> => apiRequest('/catalog/announcements'),
  getBooks: (): Promise<LibraryBook[]> => apiRequest('/catalog/books'),
  getLoans: (): Promise<LibraryLoan[]> => apiRequest('/catalog/loans'),
  getInventory: (): Promise<InventoryItem[]> => apiRequest('/catalog/inventory'),
  getTransport: (): Promise<TransportRoute[]> => apiRequest('/catalog/transport'),
  getUsers: (): Promise<AppUser[]> => apiRequest('/catalog/users'),
  getRolePermissions: (): Promise<RolePermission[]> => apiRequest('/catalog/role-permissions'),
  getPermissionCatalog: (): Promise<string[]> => apiRequest('/catalog/permissions'),
  getAuditLogs: (): Promise<AuditLog[]> => apiRequest('/catalog/audit-logs'),
  getResultPortals: (): Promise<ResultPortalView[]> => apiRequest('/catalog/result-portals'),
}
