import {
  announcements,
  appUsers,
  assessments,
  attendanceOverview,
  attendanceRecords,
  auditLogs,
  classes,
  dashboardStats,
  demoCredentials,
  enrollmentTrend,
  examinations,
  feeCollectionSeries,
  feeStructures,
  guardians,
  inventoryItems,
  invoices,
  libraryBooks,
  libraryLoans,
  marks,
  mockUsers,
  payments,
  performanceSeries,
  permissionCatalog,
  recentActivities,
  resultPortals,
  rolePermissions,
  staff,
  streams,
  students,
  subjects,
  terms,
  academicYears,
  transportRoutes,
} from '@/mocks/data'
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
import { mockRequest, USE_MOCK_API } from './client'
import type { AuthService, DashboardService, StudentService } from './contracts'
import {
  HttpAuthService,
  HttpDashboardService,
  HttpStudentService,
  httpCatalogService,
} from './http-services'

export type { AuthService, DashboardService, StudentService } from './contracts'

class MockAuthService implements AuthService {
  async login(email: string, password: string, _remember = true) {
    await mockRequest(null, 500)
    const match = demoCredentials.find(
      (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password,
    )
    if (!match) {
      throw new Error('Invalid email or password')
    }
    const user = mockUsers.find((u) => u.email === match.email)
    if (!user) throw new Error('User not found')
    return { ...user }
  }

  async logout() {
    await mockRequest(undefined, 150)
  }

  getDemoCredentials() {
    return demoCredentials
  }

  async updateProfile(userId: string, patch: Partial<AuthUser>) {
    const index = mockUsers.findIndex((u) => u.id === userId)
    if (index < 0) throw new Error('User not found')

    const current = mockUsers[index]
    const next: AuthUser = {
      ...current,
      ...patch,
      id: current.id,
      role: current.role,
      email: patch.email?.trim() || current.email,
      notificationPrefs: {
        email: patch.notificationPrefs?.email ?? current.notificationPrefs?.email ?? true,
        sms: patch.notificationPrefs?.sms ?? current.notificationPrefs?.sms ?? false,
        inApp: patch.notificationPrefs?.inApp ?? current.notificationPrefs?.inApp ?? true,
      },
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'avatarUrl') && !patch.avatarUrl) {
      delete next.avatarUrl
    }

    mockUsers[index] = next

    if (next.staffId) {
      const member = staff.find((s) => s.id === next.staffId)
      if (member) {
        const [firstName, ...rest] = next.name.trim().split(/\s+/)
        member.firstName = firstName || member.firstName
        member.lastName = rest.join(' ') || member.lastName
        member.email = next.email
        if (next.phone) member.phone = next.phone
        if (next.title) member.title = next.title
        if (next.department) member.department = next.department
        if (next.employeeNumber) member.employeeNumber = next.employeeNumber
        if (next.avatarUrl) member.photoUrl = next.avatarUrl
        else if (Object.prototype.hasOwnProperty.call(patch, 'avatarUrl')) {
          delete member.photoUrl
        }
      }
    }

    return mockRequest({ ...next }, 250)
  }
}

class MockStudentService implements StudentService {
  list() {
    return mockRequest([...students])
  }
  getById(id: string) {
    return mockRequest(students.find((s) => s.id === id))
  }
}

class MockDashboardService implements DashboardService {
  getStats() {
    return mockRequest(dashboardStats)
  }
  getEnrollmentTrend() {
    return mockRequest(enrollmentTrend)
  }
  getAttendanceOverview() {
    return mockRequest(attendanceOverview)
  }
  getFeeCollection() {
    return mockRequest(feeCollectionSeries)
  }
  getPerformance() {
    return mockRequest(performanceSeries)
  }
  getRecentPayments() {
    return mockRequest([...payments].sort((a, b) => b.paidAt.localeCompare(a.paidAt)).slice(0, 5))
  }
  getRecentActivities() {
    return mockRequest(recentActivities)
  }
}

export const authService: AuthService = USE_MOCK_API
  ? new MockAuthService()
  : new HttpAuthService()
export const studentService: StudentService = USE_MOCK_API
  ? new MockStudentService()
  : new HttpStudentService()
export const dashboardService: DashboardService = USE_MOCK_API
  ? new MockDashboardService()
  : new HttpDashboardService()

const mockCatalogService = {
  getYears: (): Promise<AcademicYear[]> => mockRequest(academicYears),
  getTerms: (): Promise<Term[]> => mockRequest(terms),
  getClasses: (): Promise<SchoolClass[]> => mockRequest(classes),
  getStreams: (): Promise<Stream[]> => mockRequest(streams),
  getSubjects: (): Promise<Subject[]> => mockRequest(subjects),
  getStaff: (): Promise<Staff[]> => mockRequest([...staff]),
  getGuardians: (): Promise<Guardian[]> => mockRequest(guardians),
  getGuardian: (id: string) => mockRequest(guardians.find((g) => g.id === id)),
  getStaffMember: (id: string) => mockRequest(staff.find((s) => s.id === id)),
  async updateStaffPhoto(id: string, photoUrl: string | undefined): Promise<Staff | undefined> {
    const member = staff.find((s) => s.id === id)
    if (!member) return mockRequest(undefined)
    if (photoUrl) member.photoUrl = photoUrl
    else delete member.photoUrl
    return mockRequest({ ...member }, 200)
  },
  async createStaff(input: Omit<Staff, 'id'>): Promise<Staff> {
    const created: Staff = {
      ...input,
      id: `st-${Date.now()}`,
    }
    staff.unshift(created)
    return mockRequest(created, 250)
  },
  getAttendance: (): Promise<AttendanceRecord[]> => mockRequest(attendanceRecords),
  getExaminations: (): Promise<Examination[]> => mockRequest(examinations),
  getAssessments: (): Promise<Assessment[]> => mockRequest(assessments),
  getMarks: (): Promise<Mark[]> => mockRequest(marks),
  getFeeStructures: (): Promise<FeeStructure[]> => mockRequest(feeStructures),
  getInvoices: (): Promise<Invoice[]> => mockRequest(invoices),
  getPayments: (): Promise<Payment[]> => mockRequest(payments),
  getAnnouncements: (): Promise<Announcement[]> => mockRequest(announcements),
  getBooks: (): Promise<LibraryBook[]> => mockRequest(libraryBooks),
  getLoans: (): Promise<LibraryLoan[]> => mockRequest(libraryLoans),
  getInventory: (): Promise<InventoryItem[]> => mockRequest(inventoryItems),
  getTransport: (): Promise<TransportRoute[]> => mockRequest(transportRoutes),
  getUsers: (): Promise<AppUser[]> => mockRequest(appUsers),
  getRolePermissions: (): Promise<RolePermission[]> => mockRequest(rolePermissions),
  getPermissionCatalog: () => mockRequest(permissionCatalog),
  getAuditLogs: (): Promise<AuditLog[]> => mockRequest(auditLogs),
  getResultPortals: (): Promise<ResultPortalView[]> => mockRequest(resultPortals),
}

export const catalogService = USE_MOCK_API ? mockCatalogService : httpCatalogService
