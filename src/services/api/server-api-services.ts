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
  ClassTransfer,
  ClubActivity,
  Examination,
  FeeStructure,
  Guardian,
  House,
  InventoryItem,
  Invoice,
  LibraryBook,
  LibraryLoan,
  Mark,
  Payment,
  ResultPortalView,
  RolePermission,
  SchoolClass,
  Sport,
  Staff,
  StaffLoginCredential,
  Stream,
  Student,
  StudentClassStats,
  StudentExemption,
  Subject,
  Term,
  AcademicYear,
  TransportRoute,
  AppUser,
} from '@/types'
import { demoCredentials } from '@/mocks/data'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
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
    try {
      const me = await this.session()
      return me.user
    } catch (err) {
      await signOut(getFirebaseAuth()).catch(() => undefined)
      throw err
    }
  }

  async logout() {
    await signOut(getFirebaseAuth())
  }

  getDemoCredentials() {
    return demoCredentials
  }

  async session() {
    return apiFetch<{ user: AuthUser; permissions: string[] }>('/api/v1/auth/me')
  }

  async me() {
    const me = await this.session()
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

  async changePassword(currentPassword: string, nextPassword: string) {
    const auth = getFirebaseAuth()
    const user = auth.currentUser
    if (!user?.email) throw new Error('Not signed in')
    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, credential)
    await updatePassword(user, nextPassword)
    await apiFetch<{ cleared: boolean }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ acknowledge: true }),
    })
  }

  async requestPasswordReset(email: string) {
    const normalized = email.trim().toLowerCase()
    if (!normalized) throw new Error('Email is required')
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), normalized)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code !== 'auth/user-not-found' && code !== 'auth/invalid-email') {
        throw err instanceof Error ? err : new Error('Could not send reset email')
      }
    }
    // Public endpoint — no auth token (user is on the login screen).
    try {
      await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
      })
    } catch {
      /* best-effort sheet clear */
    }
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
  archive: (id) =>
    apiFetch<Student>(`/api/v1/students/${id}`, { method: 'DELETE' }),
  transfer: (input) =>
    apiFetch<{ student: Student; transfer: ClassTransfer }>('/api/v1/students/transfer', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  listTransfers: (studentId) =>
    apiFetch<ClassTransfer[]>(`/api/v1/students/${studentId}/transfers`),
  listExemptions: (studentId) =>
    apiFetch<StudentExemption[]>(`/api/v1/students/${studentId}/exemptions`),
  createExemption: (studentId, input) =>
    apiFetch<StudentExemption>(`/api/v1/students/${studentId}/exemptions`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deactivateExemption: (studentId, exemptionId) =>
    apiFetch<StudentExemption>(`/api/v1/students/${studentId}/exemptions`, {
      method: 'PATCH',
      body: JSON.stringify({ id: exemptionId }),
    }),
}

type CatalogPayload = {
  years: AcademicYear[]
  terms: Term[]
  classes: SchoolClass[]
  streams: Stream[]
  subjects: Subject[]
  sports?: Sport[]
  clubs?: ClubActivity[]
  houses?: House[]
}

async function loadCatalogOnce(): Promise<CatalogPayload> {
  return apiFetch<CatalogPayload>('/api/v1/catalog')
}

export const apiClassService = {
  list: () => apiFetch<SchoolClass[]>('/api/v1/classes'),
  getStats: () => apiFetch<StudentClassStats>('/api/v1/classes?stats=1'),
  getById: (id: string) => apiFetch<SchoolClass>(`/api/v1/classes/${id}`),
  create: (
    input: Omit<SchoolClass, 'id' | 'level' | 'academicYearId'> & {
      educationLevelId: string
      academicYearId?: string
      termSequence?: 1 | 2 | 3
    },
  ) =>
    apiFetch<SchoolClass>('/api/v1/classes', { method: 'POST', body: JSON.stringify(input) }),
  update: (
    id: string,
    patch: Partial<SchoolClass> & { termSequence?: 1 | 2 | 3 },
  ) =>
    apiFetch<SchoolClass>(`/api/v1/classes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  archive: (id: string) =>
    apiFetch<SchoolClass>(`/api/v1/classes/${id}?mode=archive`, { method: 'DELETE' }),
  remove: (id: string) =>
    apiFetch<{ deleted: true; id: string }>(`/api/v1/classes/${id}`, { method: 'DELETE' }),
}

export const apiSubjectAdminService = {
  list: () => apiFetch<Subject[]>('/api/v1/subjects'),
  create: (input: Omit<Subject, 'id'>) =>
    apiFetch<Subject>('/api/v1/subjects', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, patch: Partial<Subject>) =>
    apiFetch<Subject>(`/api/v1/subjects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
}

export const apiExtracurricularService = {
  listSports: () => apiFetch<Sport[]>('/api/v1/sports'),
  createSport: (input: Omit<Sport, 'id'>) =>
    apiFetch<Sport>('/api/v1/sports', { method: 'POST', body: JSON.stringify(input) }),
  updateSport: (id: string, patch: Partial<Sport>) =>
    apiFetch<Sport>(`/api/v1/sports/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  listClubs: () => apiFetch<ClubActivity[]>('/api/v1/clubs'),
  createClub: (input: Omit<ClubActivity, 'id'>) =>
    apiFetch<ClubActivity>('/api/v1/clubs', { method: 'POST', body: JSON.stringify(input) }),
  updateClub: (id: string, patch: Partial<ClubActivity>) =>
    apiFetch<ClubActivity>(`/api/v1/clubs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  listHouses: () => apiFetch<House[]>('/api/v1/houses'),
  createHouse: (input: Omit<House, 'id'>) =>
    apiFetch<House>('/api/v1/houses', { method: 'POST', body: JSON.stringify(input) }),
  updateHouse: (id: string, patch: Partial<House>) =>
    apiFetch<House>(`/api/v1/houses/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
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
  async getSports(): Promise<Sport[]> {
    return (await loadCatalogOnce()).sports ?? []
  },
  async getClubs(): Promise<ClubActivity[]> {
    return (await loadCatalogOnce()).clubs ?? []
  },
  async getHouses(): Promise<House[]> {
    return (await loadCatalogOnce()).houses ?? []
  },
  getStaff: () => apiFetch<Staff[]>('/api/v1/teachers'),
  getGuardians: () => apiFetch<Guardian[]>('/api/v1/parents'),
  getGuardian: (id: string) => apiFetch<Guardian>(`/api/v1/parents/${id}`),
  getStaffMember: (id: string) => apiFetch<Staff>(`/api/v1/teachers/${id}`),
  updateStaff: (id: string, patch: Partial<Staff>) =>
    apiFetch<Staff>(`/api/v1/teachers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteStaff: (id: string) =>
    apiFetch<{ deleted: true; id: string }>(`/api/v1/teachers/${id}`, { method: 'DELETE' }),
  getStaffCredentials: () =>
    apiFetch<StaffLoginCredential[]>('/api/v1/teachers?credentials=1'),
  getStaffCredential: async (staffId: string) => {
    const all = await apiFetch<StaffLoginCredential[]>('/api/v1/teachers?credentials=1')
    return all.find((c) => c.staffId === staffId)
  },
  getStaffAccess: (staffId: string) =>
    apiFetch<{
      staffId: string
      roleDefaults: string[]
      assignable: string[]
      groups: { label: string; permissions: string[] }[]
      overrides: { grant?: string[]; deny?: string[] }
      effective: string[]
      selected: string[]
    }>(`/api/v1/teachers/${staffId}/access`),
  updateStaffAccess: (staffId: string, permissions: string[]) =>
    apiFetch<{
      staffId: string
      roleDefaults: string[]
      assignable: string[]
      groups: { label: string; permissions: string[] }[]
      overrides: { grant?: string[]; deny?: string[] }
      effective: string[]
      selected: string[]
    }>(`/api/v1/teachers/${staffId}/access`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),
  resetStaffPassword: (staffId: string, password?: string) =>
    apiFetch<StaffLoginCredential>(`/api/v1/teachers/${staffId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(password ? { password } : {}),
    }),
  suspendStaff: (staffId: string, input: { reason: string; endsAt?: string | null }) =>
    apiFetch<Staff>(`/api/v1/teachers/${staffId}/suspension`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  reactivateStaff: (staffId: string) =>
    apiFetch<Staff>(`/api/v1/teachers/${staffId}/suspension`, { method: 'DELETE' }),
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
      body: JSON.stringify(input),
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
  getAttendance: (opts?: { date?: string; classId?: string; kind?: 'DAILY' | 'PERIOD' }) => {
    const q = new URLSearchParams()
    if (opts?.date) q.set('date', opts.date)
    if (opts?.classId) q.set('classId', opts.classId)
    if (opts?.kind) q.set('kind', opts.kind)
    const suffix = q.toString() ? `?${q}` : ''
    return apiFetch<AttendanceRecord[]>(`/api/v1/attendance${suffix}`)
  },
  getAttendanceSessions: (opts?: { date?: string; classId?: string }) => {
    const q = new URLSearchParams({ sessions: '1' })
    if (opts?.date) q.set('date', opts.date)
    if (opts?.classId) q.set('classId', opts.classId)
    return apiFetch<import('@/types').AttendanceSession[]>(`/api/v1/attendance?${q}`)
  },
  submitDailyRegister: (input: {
    date: string
    classId: string
    entries: {
      studentId: string
      streamId: string
      status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
    }[]
  }) =>
    apiFetch<{
      session: import('@/types').AttendanceSession
      records: AttendanceRecord[]
    }>('/api/v1/attendance', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  upsertAttendance: (input: {
    date: string
    studentId: string
    classId: string
    streamId: string
    status: AttendanceRecord['status']
    kind?: 'DAILY' | 'PERIOD'
    subjectId?: string
  }) =>
    apiFetch<AttendanceRecord>('/api/v1/attendance', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getExaminations: async (): Promise<Examination[]> => [],
  getAssessments: () => apiFetch<Assessment[]>('/api/v1/results?kind=assessments'),
  getMarks: () => apiFetch<Mark[]>('/api/v1/results?kind=marks'),
  submitMonthlyMarks: (input: {
    classId: string
    subjectId: string
    month: string
    maxScore?: number
    publish?: boolean
    entries: { studentId: string; score: number }[]
  }) =>
    apiFetch<{
      assessment: Assessment
      marks: Mark[]
    }>('/api/v1/results', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  upsertMark: (input: {
    assessmentId: string
    studentId: string
    score: number
    grade?: string
  }) =>
    apiFetch<Mark>('/api/v1/results', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getGradingScale: () => apiFetch<import('@/types').GradingScale>('/api/v1/grading'),
  updateGradingScale: (input: { passMark: number; bands: import('@/types').GradeBand[] }) =>
    apiFetch<import('@/types').GradingScale>('/api/v1/grading', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  acknowledgePasswordChanged: () =>
    apiFetch<{ cleared: boolean }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ acknowledge: true }),
    }),
  getFeeStructures: async (): Promise<FeeStructure[]> => [],
  getInvoices: () => apiFetch<Invoice[]>('/api/v1/invoices'),
  getPayments: () => apiFetch<Payment[]>('/api/v1/payments'),
  getAnnouncements: () => apiFetch<Announcement[]>('/api/v1/announcements'),
  getNotifications: () =>
    apiFetch<import('@/types').AppNotification[]>('/api/v1/notifications', {
      cacheTtlMs: 15_000,
    }),
  markNotificationRead: (id: string) =>
    apiFetch<import('@/types').AppNotification | null>('/api/v1/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ id }),
    }),
  markAllNotificationsRead: () =>
    apiFetch<{ marked: number }>('/api/v1/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ markAllRead: true }),
    }),
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
