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

export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'SUSPENDED'
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

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
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
  guardianIds: string[]
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
  subjectIds: string[]
  classIds: string[]
  hireDate: string
  /** Profile photo as URL or data URL (mock UI stores uploads locally). */
  photoUrl?: string
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
  level: string
  academicYearId: string
  classTeacherId?: string
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
}

export interface Mark {
  id: string
  assessmentId: string
  studentId: string
  score: number
  grade: string
  status: MarkWorkflowStatus
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
  overallAverage?: number
  teacherComment?: string
}
