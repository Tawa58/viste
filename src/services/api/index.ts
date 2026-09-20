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
  staffCredentials,
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
} from '@/types'
import { mockRequest, USE_MOCK_API } from './client'
import type { AuthService, DashboardService, StudentService } from './contracts'
import {
  firestoreCatalogService,
  firestoreDashboardService,
  firestoreStudentService,
} from '@/services/firestore/firestore-services'
import { FirebaseAuthService } from '@/services/firebase/auth-service'
import {
  ApiAuthService,
  apiCatalogService,
  apiClassService,
  apiDashboardService,
  apiExtracurricularService,
  apiStudentService,
  apiSubjectAdminService,
} from '@/services/api/server-api-services'
import { readPublicEnv } from '@/lib/env'

/**
 * Live mode uses Next.js /api/v1 (Firebase Admin) — server is authority.
 * Set NEXT_PUBLIC_USE_CLIENT_FIRESTORE=true only for emergency/dev bypass.
 */
export const USE_SERVER_API =
  !USE_MOCK_API && readPublicEnv('USE_CLIENT_FIRESTORE', 'false') !== 'true'

/** @deprecated Prefer USE_SERVER_API. Kept for compatibility. */
export const USE_FIRESTORE_SCHOOL_DATA =
  USE_SERVER_API ||
  readPublicEnv('SCHOOL_DATA_SOURCE', 'firestore') === 'firestore' ||
  readPublicEnv('USE_FIRESTORE_DATA', 'true') === 'true' ||
  !USE_MOCK_API

export type { AuthService, DashboardService, StudentService } from './contracts'

class MockAuthService implements AuthService {
  async login(email: string, password: string, _remember = true) {
    await mockRequest(null, 500)
    const normalized = email.toLowerCase()
    const demoMatch = demoCredentials.find(
      (c) => c.email.toLowerCase() === normalized && c.password === password,
    )
    const staffMatch = staffCredentials.find(
      (c) => c.email.toLowerCase() === normalized && c.password === password,
    )
    if (!demoMatch && !staffMatch) {
      throw new Error('Invalid email or password')
    }

    let user = mockUsers.find((u) => u.email.toLowerCase() === normalized)
    if (!user && staffMatch) {
      const member = staff.find((s) => s.id === staffMatch.staffId)
      if (!member) throw new Error('User not found')
      user = {
        id: `u-${member.id}`,
        name: `${member.firstName} ${member.lastName}`,
        email: member.email,
        role: 'TEACHER',
        phone: member.phone,
        title: member.title,
        department: member.department,
        employeeNumber: member.employeeNumber,
        staffId: member.id,
        preferredLanguage: 'en',
        timezone: 'Africa/Harare',
        notificationPrefs: { email: true, sms: false, inApp: true },
      }
      mockUsers.push(user)
    }
    if (!user) throw new Error('User not found')
    return { ...user }
  }

  async logout() {
    await mockRequest(undefined, 150)
  }

  getDemoCredentials() {
    return demoCredentials
  }

  async me() {
    const raw = localStorage.getItem('viste.auth.user') ?? sessionStorage.getItem('viste.auth.user')
    if (!raw) throw new Error('Not signed in')
    return JSON.parse(raw) as AuthUser
  }

  async session() {
    const user = await this.me()
    const { resolveEffectivePermissions } = await import('@/server/authorization/rbac-map')
    let overrides = null as { grant?: string[]; deny?: string[] } | null
    if (user.staffId) {
      const member = staff.find((s) => s.id === user.staffId)
      overrides = member?.permissionOverrides ?? null
    }
    return {
      user,
      permissions: resolveEffectivePermissions(user.role, overrides),
    }
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
  async create(input: Omit<Student, 'id'>) {
    const { previewNextVhsNumber } = await import('@/lib/student-numbers')
    const allocated = previewNextVhsNumber(students, input.admissionDate)
    const created: Student = {
      ...input,
      id: `stu-${Date.now()}`,
      studentNumber: input.studentNumber?.trim() || allocated,
      admissionNumber: input.admissionNumber?.trim() || allocated,
      subjectIds: [...input.subjectIds],
      guardianIds: [...input.guardianIds],
      sportIds: [...(input.sportIds ?? [])],
      clubIds: [...(input.clubIds ?? [])],
    }
    students.unshift(created)
    for (const gid of created.guardianIds) {
      const guardian = guardians.find((g) => g.id === gid)
      if (guardian && !guardian.studentIds.includes(created.id)) {
        guardian.studentIds.push(created.id)
      }
    }
    return mockRequest(created, 280)
  }
  async update(id: string, patch: Partial<Omit<Student, 'id'>>) {
    const index = students.findIndex((s) => s.id === id)
    if (index < 0) throw new Error('Student not found')
    const current = students[index]
    const next: Student = {
      ...current,
      ...patch,
      subjectIds: patch.subjectIds ? [...patch.subjectIds] : current.subjectIds,
      guardianIds: patch.guardianIds ? [...patch.guardianIds] : current.guardianIds,
    }
    students[index] = next
    if (patch.guardianIds) {
      for (const guardian of guardians) {
        const linked = next.guardianIds.includes(guardian.id)
        const has = guardian.studentIds.includes(id)
        if (linked && !has) guardian.studentIds.push(id)
        if (!linked && has) {
          guardian.studentIds = guardian.studentIds.filter((sid) => sid !== id)
        }
      }
    }
    return mockRequest({ ...next }, 250)
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
  : USE_SERVER_API
    ? new ApiAuthService()
    : new FirebaseAuthService()

export const studentService: StudentService = USE_MOCK_API
  ? new MockStudentService()
  : USE_SERVER_API
    ? apiStudentService
    : firestoreStudentService

export const dashboardService: DashboardService = USE_MOCK_API
  ? new MockDashboardService()
  : USE_SERVER_API
    ? apiDashboardService
    : firestoreDashboardService

const mockCatalogService = {
  getYears: (): Promise<AcademicYear[]> => mockRequest(academicYears),
  getTerms: (): Promise<Term[]> => mockRequest(terms),
  getClasses: (): Promise<SchoolClass[]> => mockRequest(classes),
  getStreams: (): Promise<Stream[]> => mockRequest(streams),
  getSubjects: (): Promise<Subject[]> => mockRequest(subjects),
  getSports: (): Promise<import('@/types').Sport[]> => mockRequest([]),
  getClubs: (): Promise<import('@/types').ClubActivity[]> => mockRequest([]),
  getHouses: (): Promise<import('@/types').House[]> => mockRequest([]),
  getStaff: (): Promise<Staff[]> => mockRequest([...staff]),
  getGuardians: (): Promise<Guardian[]> => mockRequest([...guardians]),
  getGuardian: (id: string) => mockRequest(guardians.find((g) => g.id === id)),
  getStaffMember: (id: string) => mockRequest(staff.find((s) => s.id === id)),
  getStaffCredentials: (): Promise<StaffLoginCredential[]> => mockRequest([...staffCredentials]),
  getStaffCredential: (staffId: string) =>
    mockRequest(staffCredentials.find((c) => c.staffId === staffId)),
  async getStaffAccess(staffId: string) {
    const { listPermissions, TEACHER_ASSIGNABLE_PERMISSIONS, TEACHER_PERMISSION_GROUPS, resolveEffectivePermissions } =
      await import('@/server/authorization/rbac-map')
    const member = staff.find((s) => s.id === staffId)
    if (!member) throw new Error('Staff not found')
    const overrides = member.permissionOverrides ?? {}
    const effective = resolveEffectivePermissions('TEACHER', overrides)
    const assignable = [...TEACHER_ASSIGNABLE_PERMISSIONS]
    return mockRequest({
      staffId,
      roleDefaults: listPermissions('TEACHER'),
      assignable,
      groups: TEACHER_PERMISSION_GROUPS.map((g) => ({
        label: g.label,
        permissions: [...g.permissions],
      })),
      overrides,
      effective,
      selected: assignable.filter((p) => effective.includes(p)),
    })
  },
  async updateStaffAccess(staffId: string, permissions: string[]) {
    const { overridesFromTeacherSelection } = await import('@/server/authorization/rbac-map')
    const member = staff.find((s) => s.id === staffId)
    if (!member) throw new Error('Staff not found')
    member.permissionOverrides = overridesFromTeacherSelection(permissions)
    return this.getStaffAccess(staffId)
  },
  async resetStaffPassword(staffId: string, password?: string): Promise<StaffLoginCredential> {
    const existing = staffCredentials.find((c) => c.staffId === staffId)
    const member = staff.find((s) => s.id === staffId)
    if (!member) throw new Error('Staff member not found')
    const nextPassword = password && password.length >= 8 ? password : `Tmp${Date.now().toString(36)}!`
    const next: StaffLoginCredential = {
      staffId,
      email: member.email,
      password: nextPassword,
      role: 'TEACHER',
      temporaryPassword: true,
      lastResetAt: new Date().toISOString().slice(0, 10),
    }
    if (existing) {
      Object.assign(existing, next)
      return mockRequest({ ...existing }, 250)
    }
    staffCredentials.push(next)
    return mockRequest({ ...next }, 250)
  },
  async updateStaffPhoto(
    id: string,
    patch: { profilePhotoId?: string | null; photoUrl?: string | null },
  ): Promise<Staff | undefined> {
    const member = staff.find((s) => s.id === id)
    if (!member) return mockRequest(undefined)
    if (patch.profilePhotoId) member.profilePhotoId = patch.profilePhotoId
    else if (patch.profilePhotoId === null) delete member.profilePhotoId
    if (patch.photoUrl) member.photoUrl = patch.photoUrl
    else if (patch.photoUrl === null) delete member.photoUrl
    return mockRequest({ ...member }, 200)
  },
  async createStaff(input: Omit<Staff, 'id'> & { password?: string }): Promise<Staff> {
    const { password = 'demo1234', ...staffInput } = input
    const created: Staff = {
      ...staffInput,
      id: `st-${Date.now()}`,
    }
    staff.unshift(created)
    staffCredentials.unshift({
      staffId: created.id,
      email: created.email,
      password,
      role: 'TEACHER',
      temporaryPassword: true,
      lastResetAt: new Date().toISOString().slice(0, 10),
    })
    return mockRequest(created, 250)
  },
  async updateGuardian(id: string, patch: Partial<Omit<Guardian, 'id'>>): Promise<Guardian> {
    const index = guardians.findIndex((g) => g.id === id)
    if (index < 0) throw new Error('Guardian not found')
    const next: Guardian = {
      ...guardians[index],
      ...patch,
      studentIds: patch.studentIds ? [...patch.studentIds] : guardians[index].studentIds,
    }
    guardians[index] = next
    return mockRequest({ ...next }, 250)
  },
  async createGuardian(input: Omit<Guardian, 'id'>): Promise<Guardian> {
    const created: Guardian = {
      ...input,
      id: `g-${Date.now()}`,
      studentIds: [...input.studentIds],
    }
    guardians.unshift(created)
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

export const catalogService = USE_MOCK_API
  ? mockCatalogService
  : USE_SERVER_API
    ? apiCatalogService
    : firestoreCatalogService

export const classService = USE_MOCK_API
  ? {
      list: () => mockRequest([...classes]),
      getStats: async () => ({
        totalStudents: students.length,
        totalClasses: classes.length,
        ecdStudents: 0,
        primaryStudents: 0,
        secondaryStudents: students.length,
        activeStudents: students.filter((s) => s.status === 'ACTIVE').length,
        transferredStudents: students.filter((s) => s.status === 'TRANSFERRED').length,
        archivedStudents: students.filter((s) => s.status === 'ARCHIVED' || s.status === 'INACTIVE')
          .length,
        classDistribution: classes.map((c) => ({
          classId: c.id,
          className: c.name,
          count: students.filter((s) => s.classId === c.id).length,
        })),
      }),
      getById: (id: string) => mockRequest(classes.find((c) => c.id === id)!),
      create: async (
        input: Omit<SchoolClass, 'id' | 'level' | 'academicYearId'> & {
          educationLevelId: string
          academicYearId?: string
          termSequence?: 1 | 2 | 3
        },
      ) => {
        const created: SchoolClass = {
          ...input,
          id: `cls-${Date.now()}`,
          level: input.educationLevelId,
          academicYearId: input.academicYearId || `ay-${new Date().getFullYear()}`,
          termSequence: input.termSequence ?? 1,
          status: input.status ?? 'ACTIVE',
        }
        classes.unshift(created)
        streams.unshift({
          id: `str-${Date.now()}`,
          classId: created.id,
          name: created.name,
          capacity: input.capacity ?? 40,
        })
        return mockRequest(created, 250)
      },
      update: async (
        id: string,
        patch: Partial<SchoolClass> & { termSequence?: 1 | 2 | 3 },
      ) => {
        const idx = classes.findIndex((c) => c.id === id)
        if (idx < 0) throw new Error('Class not found')
        classes[idx] = { ...classes[idx], ...patch, id }
        return mockRequest({ ...classes[idx] }, 200)
      },
      archive: async (id: string) => {
        const idx = classes.findIndex((c) => c.id === id)
        if (idx < 0) throw new Error('Class not found')
        classes[idx] = { ...classes[idx], status: 'ARCHIVED' }
        return mockRequest({ ...classes[idx] }, 200)
      },
    }
  : apiClassService

export const subjectAdminService = USE_MOCK_API
  ? {
      list: () => mockRequest([...subjects]),
      create: async (input: Omit<Subject, 'id'>) => {
        const created: Subject = { ...input, id: `sub-${Date.now()}`, active: input.active ?? true }
        subjects.unshift(created)
        return mockRequest(created, 200)
      },
      update: async (id: string, patch: Partial<Subject>) => {
        const idx = subjects.findIndex((s) => s.id === id)
        if (idx < 0) throw new Error('Subject not found')
        subjects[idx] = { ...subjects[idx], ...patch, id }
        return mockRequest({ ...subjects[idx] }, 200)
      },
    }
  : apiSubjectAdminService

export const extracurricularService = USE_MOCK_API
  ? {
      listSports: () => mockRequest([] as import('@/types').Sport[]),
      createSport: async (input: Omit<import('@/types').Sport, 'id'>) =>
        mockRequest({ ...input, id: `sport-${Date.now()}` }, 200),
      updateSport: async (id: string, patch: Partial<import('@/types').Sport>) =>
        mockRequest({ id, name: 'Sport', active: true, ...patch }, 200),
      listClubs: () => mockRequest([] as import('@/types').ClubActivity[]),
      createClub: async (input: Omit<import('@/types').ClubActivity, 'id'>) =>
        mockRequest({ ...input, id: `club-${Date.now()}` }, 200),
      updateClub: async (id: string, patch: Partial<import('@/types').ClubActivity>) =>
        mockRequest({ id, name: 'Club', type: 'CLUB' as const, active: true, ...patch }, 200),
      listHouses: () => mockRequest([] as import('@/types').House[]),
      createHouse: async (input: Omit<import('@/types').House, 'id'>) =>
        mockRequest({ ...input, id: `house-${Date.now()}` }, 200),
      updateHouse: async (id: string, patch: Partial<import('@/types').House>) =>
        mockRequest({ id, name: 'House', active: true, ...patch }, 200),
    }
  : apiExtracurricularService
