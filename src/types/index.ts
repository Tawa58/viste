export type UserRole =
  | 'SUPER_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'PRINCIPAL'
  | 'TEACHER'
  | 'ACCOUNTANT'
  | 'FINANCE_OFFICER'
  | 'REGISTRAR'
  | 'RECEPTIONIST'
  | 'STUDENT'
  | 'PARENT'
  | 'LIBRARIAN'
  | 'TRANSPORT_MANAGER'

export type StudentStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'GRADUATED'
  | 'TRANSFERRED'
  | 'SUSPENDED'
  | 'WITHDRAWN'
  | 'ARCHIVED'

export type ClassStatus = 'ACTIVE' | 'ARCHIVED'

export type ExemptionType = 'SUBJECT' | 'SPORT' | 'ACTIVITY' | 'OTHER'

export type ClubActivityType = 'CLUB' | 'SOCIETY' | 'ACTIVITY' | 'OTHER'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'AUTHORIZED_ABSENCE'
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REVERSED' | 'CANCELLED'
export type ResultAccessState =
  | 'RESULTS_AVAILABLE'
  | 'RESULTS_LOCKED_FEES'
  | 'RESULTS_NOT_PUBLISHED'
  | 'ACCOUNT_RESTRICTED'
export type MarkWorkflowStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'LOCKED'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string | null
  /** Firestore file id for avatar when using chunked file storage. */
  avatarFileId?: string | null
  phone?: string
  title?: string
  department?: string
  employeeNumber?: string
  /** Links profile updates to the staff directory when present. */
  staffId?: string
  studentId?: string
  guardianId?: string
  bio?: string
  preferredLanguage?: 'en' | 'sn' | 'nd'
  timezone?: string
  notificationPrefs?: {
    email: boolean
    sms: boolean
    inApp: boolean
  }
}

export interface Student {
  id: string
  studentNumber: string
  admissionNumber: string
  firstName: string
  middleName?: string
  lastName: string
  dateOfBirth: string
  gender: 'Male' | 'Female'
  email?: string
  phone?: string
  address: string
  admissionDate: string
  status: StudentStatus
  classId: string
  streamId: string
  /** Canonical education level id (ecd, grade-1, form-1, …). */
  educationLevelId?: string
  academicYearId?: string
  termId?: string
  /** Subjects the student is registered for. */
  subjectIds: string[]
  sportIds?: string[]
  clubIds?: string[]
  houseId?: string
  guardianIds: string[]
  /** Firestore `files/{id}` reference — never store image bytes here. */
  profilePhotoId?: string
}

export interface StaffLoginCredential {
  staffId: string
  email: string
  /** Admin-issued temporary password (shown on login sheet until reset again). */
  password: string
  role: Extract<UserRole, 'TEACHER' | 'SCHOOL_ADMIN' | 'PRINCIPAL' | 'ACCOUNTANT' | 'REGISTRAR'>
  /** True when the password was issued by an admin and should be changed after first login. */
  temporaryPassword?: boolean
  lastResetAt?: string
}

export interface Guardian {
  id: string
  firstName: string
  lastName: string
  relationship: string
  email: string
  phone: string
  address: string
  studentIds: string[]
  occupation?: string
  /** Marked as the primary emergency contact when true. */
  emergencyContact?: boolean
}

/** Admin-issued portal suspension (INACTIVE while this is in effect). */
export interface StaffSuspension {
  reason: string
  /** ISO date (YYYY-MM-DD) when suspension started. */
  startsAt: string
  /**
   * ISO date (YYYY-MM-DD) when access resumes, or null for indefinite
   * (admin must reactivate).
   */
  endsAt: string | null
  suspendedAt: string
  suspendedBy: string
  suspendedByName?: string
}

export interface Staff {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  title: string
  status: 'ACTIVE' | 'INACTIVE'
  /** Present while suspended / inactivated by an admin. */
  suspension?: StaffSuspension | null
  subjectIds: string[]
  classIds: string[]
  hireDate: string
  /**
   * Per-teacher RBAC overrides (grant/deny on top of TEACHER role defaults).
   * Only admins with teachers.manage / roles.manage may edit.
   */
  permissionOverrides?: {
    grant?: string[]
    deny?: string[]
  }
  /** Firestore `files/{id}` reference — never store image bytes here. */
  profilePhotoId?: string
  /**
   * @deprecated Local preview/cache only. Prefer `profilePhotoId` + fileService.
   */
  photoUrl?: string
}

/** One band in the school grading scale (percent of max score). */
export interface GradeBand {
  grade: string
  minPercent: number
  maxPercent: number
}

export interface GradingScale {
  id: string
  passMark: number
  bands: GradeBand[]
  updatedAt?: string
  updatedBy?: string
}

export interface AcademicYear {
  id: string
  name: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

export interface Term {
  id: string
  academicYearId: string
  name: string
  sequence: number
  startDate: string
  endDate: string
}

export interface SchoolClass {
  id: string
  name: string
  /** Display / legacy label — prefer educationLevelId. */
  level: string
  educationLevelId?: string
  academicYearId: string
  termId?: string
  /** 1 | 2 | 3 — denormalized for display when term docs vary. */
  termSequence?: number
  classTeacherId?: string
  /** Subjects offered / undertaken by this class. */
  subjectIds?: string[]
  description?: string
  status?: ClassStatus
  capacity?: number
}

export interface Stream {
  id: string
  classId: string
  name: string
  capacity: number
}

export interface Subject {
  id: string
  code: string
  name: string
  category: string
  /** Levels this subject is offered for (filters student registration). */
  educationLevelIds?: string[]
  teacherIds?: string[]
  active?: boolean
}

export interface Sport {
  id: string
  name: string
  description?: string
  active: boolean
}

export interface ClubActivity {
  id: string
  name: string
  type: ClubActivityType
  description?: string
  active: boolean
}

export interface House {
  id: string
  name: string
  color?: string
  active: boolean
}

export interface StudentExemption {
  id: string
  studentId: string
  type: ExemptionType
  /** Subject / sport / club id when applicable. */
  targetId?: string
  targetLabel: string
  reason: string
  startDate: string
  endDate?: string
  notes?: string
  createdBy: string
  createdByName?: string
  createdAt: string
  active: boolean
}

export interface ClassTransfer {
  id: string
  studentId: string
  fromClassId: string
  toClassId: string
  fromStreamId?: string
  toStreamId?: string
  date: string
  reason?: string
  notes?: string
  transferredBy: string
  transferredByName?: string
}

export interface StudentClassStats {
  totalStudents: number
  totalClasses: number
  ecdStudents: number
  primaryStudents: number
  secondaryStudents: number
  activeStudents: number
  transferredStudents: number
  archivedStudents: number
  classDistribution: { classId: string; className: string; count: number }[]
}

export interface AttendanceRecord {
  id: string
  date: string
  studentId: string
  classId: string
  streamId: string
  subjectId?: string
  status: AttendanceStatus
  recordedBy: string
  /** Homeroom daily register vs subject period mark. */
  kind?: 'DAILY' | 'PERIOD'
  recordedAt?: string
}

/** One submitted daily register for a class on a date. */
export interface AttendanceSession {
  id: string
  date: string
  classId: string
  className?: string
  submittedAt: string
  submittedBy: string
  submittedByName?: string
  presentCount: number
  absentCount: number
  lateCount?: number
  excusedCount?: number
  totalCount: number
}

export type AppNotificationType =
  | 'REGISTER_SUBMITTED'
  | 'REGISTER_SUBMITTED_DIGEST'
  | 'REGISTER_MISSING'

export interface AppNotificationClassContact {
  classId: string
  className: string
  teacherName?: string
  teacherPhone?: string
  teacherEmail?: string
}

/** In-app notification (admin bell + list). */
export interface AppNotification {
  id: string
  audience: 'ADMIN'
  type: AppNotificationType
  title: string
  body: string
  createdAt: string
  read: boolean
  /** Attendance calendar date (YYYY-MM-DD) when relevant. */
  date?: string
  href?: string
  meta?: {
    classId?: string
    className?: string
    teacherName?: string
    count?: number
    classes?: AppNotificationClassContact[]
  }
}

export interface Examination {
  id: string
  name: string
  termId: string
  startDate: string
  endDate: string
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED'
}

export interface Assessment {
  id: string
  examinationId?: string
  name: string
  type: string
  subjectId: string
  streamId: string
  termId: string
  maxScore: number
  status: MarkWorkflowStatus
  /** Class for class-scoped assessments (e.g. monthly tests). */
  classId?: string
  /** YYYY-MM for end-of-month tests. */
  month?: string
}

export interface Mark {
  id: string
  assessmentId: string
  studentId: string
  score: number
  grade: string
  status: MarkWorkflowStatus
  recordedAt?: string
  recordedBy?: string
}

export interface FeeStructure {
  id: string
  name: string
  academicYearId: string
  classId: string
  items: { name: string; amount: number }[]
}

export interface Invoice {
  id: string
  studentId: string
  number: string
  dueDate: string
  total: number
  paid: number
  status: 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE'
}

export interface Payment {
  id: string
  studentId: string
  invoiceId: string
  amount: number
  method: string
  status: PaymentStatus
  paidAt: string
  receiptNumber: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  audience: string[]
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED'
  publishedAt?: string
  author: string
}

export interface LibraryBook {
  id: string
  title: string
  author: string
  category: string
  isbn: string
  copies: number
  available: number
}

export interface LibraryLoan {
  id: string
  bookId: string
  studentId: string
  borrowedAt: string
  dueAt: string
  returnedAt?: string
  fine: number
}

export interface InventoryItem {
  id: string
  name: string
  category: string
  sku: string
  quantity: number
  location: string
  supplier: string
}

export interface TransportRoute {
  id: string
  name: string
  vehicle: string
  driver: string
  fee: number
  studentIds: string[]
}

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: 'ACTIVE' | 'DISABLED'
  lastLogin?: string
}

export interface RolePermission {
  role: UserRole
  permissions: string[]
}

export interface AuditLog {
  id: string
  user: string
  action: string
  module: string
  record: string
  status: 'SUCCESS' | 'FAILED' | 'WARNING'
  at: string
}

export interface DashboardStats {
  totalStudents: number
  totalTeachers: number
  todayAttendancePct: number
  outstandingFees: number
  feesCollected: number
  pendingResults: number
}

export interface EnrollmentPoint {
  month: string
  students: number
}

export interface ResultPortalView {
  studentId: string
  studentName: string
  className: string
  streamName: string
  academicYear: string
  term: string
  accessState: ResultAccessState
  subjects: { name: string; score: number; grade: string; comment?: string }[]
  /** Structured monthly progress for the student portal. */
  monthly?: {
    month: string
    label: string
    rows: { subject: string; score: number; grade: string; maxScore: number }[]
    average?: number
  }[]
  overallAverage?: number
  teacherComment?: string
}
