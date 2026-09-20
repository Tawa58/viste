/**
 * Server-backed school data via Next.js /api/v1 (Firebase Admin).
 * Preserves existing service interfaces so UI views stay unchanged.
 */
import { apiFetch } from '@/services/api/http-client'
import type { AuthService, DashboardService, StudentService } from '@/services/api/contracts'
import type {
  Announcement,
  Assessment,
  AttendanceRecord,
  AuditLog,
  AuthUser,
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
  StaffLoginCredential,
  Stream,
  Student,
  Subject,
  Term,
  AcademicYear,
  TransportRoute,
  AppUser,
} from '@/types'
import { demoCredentials } from '@/mocks/data'
import {
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { getFirebaseAuth } from '@/services/firebase/app'

export class ApiAuthService implements AuthService {
  async login(email: string, password: string) {
    await signInWithEmailAndPassword(
      getFirebaseAuth(),
      email.trim().toLowerCase(),
      password,
    )
    const me = await apiFetch<{ user: AuthUser; permissions: string[] }>('/api/v1/auth/me')
    return me.user
  }

  async logout() {
    await signOut(getFirebaseAuth())
  }

  getDemoCredentials() {
    return demoCredentials
  }

  async me() {
    const me = await apiFetch<{ user: AuthUser }>('/api/v1/auth/me')
    return me.user
  }

  async updateProfile(userId: string, patch: Partial<AuthUser>) {
    if (getFirebaseAuth().currentUser && patch.name) {
      await updateProfile(getFirebaseAuth().currentUser!, { displayName: patch.name })
    }
    const res = await apiFetch<{ user: AuthUser }>('/api/v1/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    return res.user
  }
}

export const apiStudentService: StudentService = {
  list: () => apiFetch<Student[]>('/api/v1/students'),
  getById: async (id) => {
    try {
      return await apiFetch<Student>(`/api/v1/students/${id}`)
    } catch (e) {
      if (e instanceof Error && 'status' in e && (e as { status: number }).status === 404) {
        return undefined
      }
      throw e
    }
  },
  create: (input) =>
    apiFetch<Student>('/api/v1/students', { method: 'POST', body: JSON.stringify(input) }),
  update: (id, patch) =>
    apiFetch<Student>(`/api/v1/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
}

type CatalogPayload = {
  years: AcademicYear[]
  terms: Term[]
  classes: SchoolClass[]
  streams: Stream[]
  subjects: Subject[]
}

async function loadCatalogOnce(): Promise<CatalogPayload> {
  return apiFetch<CatalogPayload>('/api/v1/catalog')
}

type DashboardPayload = {
  stats: Awaited<ReturnType<DashboardService['getStats']>>
  enrollment: { month: string; students: number }[]
  attendanceOverview: { name: string; value: number }[]
  feeCollection: { month: string; collected: number; outstanding: number }[]
  performance: { subject: string; average: number }[]
  recentPayments: Payment[]
  recentActivities: { id: string; title: string; detail: string; at: string }[]
}

async function loadDashboardOnce(): Promise<DashboardPayload> {
  return apiFetch<DashboardPayload>('/api/v1/dashboard')
}

export const apiDashboardService: DashboardService = {
  async getStats() {
    return (await loadDashboardOnce()).stats
  },
  async getEnrollmentTrend() {
    return (await loadDashboardOnce()).enrollment
  },
  async getAttendanceOverview() {
    return (await loadDashboardOnce()).attendanceOverview
  },
  async getFeeCollection() {
    return (await loadDashboardOnce()).feeCollection
  },
  async getPerformance() {
    return (await loadDashboardOnce()).performance
  },
  async getRecentPayments() {
    return (await loadDashboardOnce()).recentPayments
  },
  async getRecentActivities() {
    return (await loadDashboardOnce()).recentActivities
  },
}

export const apiCatalogService = {
  async getYears(): Promise<AcademicYear[]> {
    return (await loadCatalogOnce()).years
  },
  async getTerms(): Promise<Term[]> {
    return (await loadCatalogOnce()).terms ?? []
  },
  async getClasses(): Promise<SchoolClass[]> {
    return (await loadCatalogOnce()).classes
  },
  async getStreams(): Promise<Stream[]> {
    return (await loadCatalogOnce()).streams
  },
  async getSubjects(): Promise<Subject[]> {
    return (await loadCatalogOnce()).subjects
  },
  getStaff: () => apiFetch<Staff[]>('/api/v1/teachers'),
  getGuardians: () => apiFetch<Guardian[]>('/api/v1/parents'),
  getGuardian: (id: string) => apiFetch<Guardian>(`/api/v1/parents/${id}`),
  getStaffMember: async (id: string) => {
    const all = await apiFetch<Staff[]>('/api/v1/teachers')
    return all.find((s) => s.id === id)
  },
  getStaffCredentials: () =>
    apiFetch<StaffLoginCredential[]>('/api/v1/teachers?credentials=1'),
  getStaffCredential: async (staffId: string) => {
    const all = await apiFetch<StaffLoginCredential[]>('/api/v1/teachers?credentials=1')
    return all.find((c) => c.staffId === staffId)
  },
  resetStaffPassword: (staffId: string, password = 'demo1234') =>
    apiFetch<StaffLoginCredential>(`/api/v1/teachers/${staffId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  updateStaffPhoto: async (
    id: string,
    patch: { profilePhotoId?: string | null; photoUrl?: string | null },
  ) => {
    const member = await apiCatalogService.getStaffMember(id)
    if (!member) return undefined
    return { ...member, ...patch } as Staff
  },
  createStaff: (input: Omit<Staff, 'id'> & { password?: string }) =>
    apiFetch<Staff>('/api/v1/teachers', {
      method: 'POST',
      body: JSON.stringify({ ...input, password: input.password ?? 'ChangeMe123!' }),
    }),
  updateGuardian: (id: string, patch: Partial<Omit<Guardian, 'id'>>) =>
    apiFetch<Guardian>(`/api/v1/parents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  createGuardian: (input: Omit<Guardian, 'id'>) =>
    apiFetch<Guardian>('/api/v1/parents', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getAttendance: () => apiFetch<AttendanceRecord[]>('/api/v1/attendance'),
  getExaminations: async (): Promise<Examination[]> => [],
  getAssessments: () => apiFetch<Assessment[]>('/api/v1/results?kind=assessments'),
  getMarks: () => apiFetch<Mark[]>('/api/v1/results?kind=marks'),
  getFeeStructures: async (): Promise<FeeStructure[]> => [],
  getInvoices: () => apiFetch<Invoice[]>('/api/v1/invoices'),
  getPayments: () => apiFetch<Payment[]>('/api/v1/payments'),
  getAnnouncements: () => apiFetch<Announcement[]>('/api/v1/announcements'),
  getBooks: async (): Promise<LibraryBook[]> => [],
  getLoans: async (): Promise<LibraryLoan[]> => [],
  getInventory: async (): Promise<InventoryItem[]> => [],
  getTransport: async (): Promise<TransportRoute[]> => [],
  getUsers: async (): Promise<AppUser[]> => [],
  getRolePermissions: async (): Promise<RolePermission[]> => [],
  getPermissionCatalog: async () => [] as string[],
  getAuditLogs: () => apiFetch<AuditLog[]>('/api/v1/audit-logs'),
  getResultPortals: async (): Promise<ResultPortalView[]> => [],
  getResultPortal: (studentId: string) =>
    apiFetch<ResultPortalView>(`/api/v1/results?studentId=${encodeURIComponent(studentId)}`),
}
