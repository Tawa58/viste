import type {
  Announcement,
  AppUser,
  Assessment,
  AttendanceRecord,
  AuditLog,
  DashboardStats,
  EnrollmentPoint,
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
  AuthUser,
  StaffLoginCredential,
} from '@/types'

export const demoCredentials = [
  {
    email: 'admin@viste.school',
    password: 'demo1234',
    label: 'School Admin',
    role: 'SCHOOL_ADMIN' as const,
  },
  {
    email: 'teacher@viste.school',
    password: 'demo1234',
    label: 'Teacher',
    role: 'TEACHER' as const,
  },
  {
    email: 'parent@viste.school',
    password: 'demo1234',
    label: 'Parent',
    role: 'PARENT' as const,
  },
  {
    email: 'student@viste.school',
    password: 'demo1234',
    label: 'Student',
    role: 'STUDENT' as const,
  },
]

export const mockUsers: AuthUser[] = [
  {
    id: 'u-admin',
    name: 'Caxton Nyathi',
    email: 'admin@viste.school',
    role: 'SCHOOL_ADMIN',
    phone: '+1 555 1000',
    title: 'School Administrator',
    department: 'Administration',
    employeeNumber: 'EMP-0001',
    preferredLanguage: 'en',
    timezone: 'Africa/Harare',
    bio: 'Oversees school operations, staff accounts, and academic calendar.',
    notificationPrefs: { email: true, sms: true, inApp: true },
  },
  {
    id: 'u-teacher',
    name: 'Teacher Portal',
    email: 'teacher@viste.school',
    role: 'TEACHER',
    phone: '+1 555 0101',
    title: 'Teacher',
    department: 'Academics',
    preferredLanguage: 'en',
    timezone: 'Africa/Harare',
    bio: 'Teacher portal access. Link a staff profile after registering teachers.',
    notificationPrefs: { email: true, sms: false, inApp: true },
  },
  {
    id: 'u-parent',
    name: 'Parent Portal',
    email: 'parent@viste.school',
    role: 'PARENT',
    phone: '+1 555 0200',
    title: 'Parent / Guardian',
    preferredLanguage: 'en',
    timezone: 'Africa/Harare',
    bio: 'Parent portal access. Linked after a guardian is registered.',
    notificationPrefs: { email: true, sms: true, inApp: true },
  },
  {
    id: 'u-student',
    name: 'Student Portal',
    email: 'student@viste.school',
    role: 'STUDENT',
    phone: '+1 555 0300',
    title: 'Student',
    preferredLanguage: 'en',
    timezone: 'Africa/Harare',
    bio: 'Student portal access. Linked after a student is registered.',
    notificationPrefs: { email: false, sms: false, inApp: true },
  },
]

export const academicYears: AcademicYear[] = [
  {
    id: 'ay-2025',
    name: '2025/2026',
    startDate: '2025-09-01',
    endDate: '2026-07-31',
    isCurrent: true,
  },
  {
    id: 'ay-2024',
    name: '2024/2025',
    startDate: '2024-09-01',
    endDate: '2025-07-31',
    isCurrent: false,
  },
]

export const terms: Term[] = [
  {
    id: 't1',
    academicYearId: 'ay-2025',
    name: 'Term 1',
    sequence: 1,
    startDate: '2025-09-01',
    endDate: '2025-12-12',
  },
  {
    id: 't2',
    academicYearId: 'ay-2025',
    name: 'Term 2',
    sequence: 2,
    startDate: '2026-01-12',
    endDate: '2026-04-03',
  },
  {
    id: 't3',
    academicYearId: 'ay-2025',
    name: 'Term 3',
    sequence: 3,
    startDate: '2026-04-20',
    endDate: '2026-07-17',
  },
]

export const subjects: Subject[] = [
  { id: 'sub-math', code: 'MATH', name: 'Mathematics', category: 'Core' },
  { id: 'sub-eng', code: 'ENG', name: 'English', category: 'Core' },
  { id: 'sub-sci', code: 'SCI', name: 'Science', category: 'Core' },
  { id: 'sub-hist', code: 'HIST', name: 'History', category: 'Humanities' },
  { id: 'sub-geo', code: 'GEO', name: 'Geography', category: 'Humanities' },
  { id: 'sub-cs', code: 'CS', name: 'Computer Science', category: 'STEM' },
  { id: 'sub-pe', code: 'PE', name: 'Physical Education', category: 'Co-curricular' },
  { id: 'sub-art', code: 'ART', name: 'Art & Design', category: 'Co-curricular' },
]

/** Empty by design — register real teachers in the UI / Firestore. */
export const staff: Staff[] = []

/** Teacher/staff portal login details (filled when staff are registered). */
export const staffCredentials: StaffLoginCredential[] = []

export const classes: SchoolClass[] = [
  {
    id: 'cls-f1',
    name: 'Form 1',
    level: 'Form 1',
    academicYearId: 'ay-2025',
  },
  {
    id: 'cls-f2',
    name: 'Form 2',
    level: 'Form 2',
    academicYearId: 'ay-2025',
  },
  {
    id: 'cls-f3',
    name: 'Form 3',
    level: 'Form 3',
    academicYearId: 'ay-2025',
  },
  {
    id: 'cls-f4',
    name: 'Form 4',
    level: 'Form 4',
    academicYearId: 'ay-2025',
  },
]

export const streams: Stream[] = [
  { id: 'str-1a', classId: 'cls-f1', name: '1A', capacity: 35 },
  { id: 'str-1b', classId: 'cls-f1', name: '1B', capacity: 35 },
  { id: 'str-2a', classId: 'cls-f2', name: '2A', capacity: 35 },
  { id: 'str-2b', classId: 'cls-f2', name: '2B', capacity: 35 },
  { id: 'str-3a', classId: 'cls-f3', name: '3A', capacity: 32 },
  { id: 'str-3b', classId: 'cls-f3', name: '3B', capacity: 32 },
  { id: 'str-4a', classId: 'cls-f4', name: '4A', capacity: 30 },
  { id: 'str-4b', classId: 'cls-f4', name: '4B', capacity: 30 },
]

/** Empty by design — add guardians when registering students. */
export const guardians: Guardian[] = []

/** Empty by design — register real students in the UI / Firestore. */
export const students: Student[] = []

export const attendanceRecords: AttendanceRecord[] = []

export const examinations: Examination[] = [
  {
    id: 'ex-1',
    name: 'Term 1 Mid-Term',
    termId: 't1',
    startDate: '2025-10-20',
    endDate: '2025-10-31',
    status: 'COMPLETED',
  },
  {
    id: 'ex-2',
    name: 'Term 1 Final',
    termId: 't1',
    startDate: '2025-11-24',
    endDate: '2025-12-05',
    status: 'COMPLETED',
  },
  {
    id: 'ex-3',
    name: 'Term 2 Continuous Assessment',
    termId: 't2',
    startDate: '2026-02-10',
    endDate: '2026-02-21',
    status: 'ONGOING',
  },
]

export const assessments: Assessment[] = [
  {
    id: 'as-1',
    examinationId: 'ex-2',
    name: 'Mathematics Final',
    type: 'Final',
    subjectId: 'sub-math',
    streamId: 'str-3a',
    termId: 't1',
    maxScore: 100,
    status: 'PUBLISHED',
  },
  {
    id: 'as-2',
    examinationId: 'ex-2',
    name: 'English Final',
    type: 'Final',
    subjectId: 'sub-eng',
    streamId: 'str-3a',
    termId: 't1',
    maxScore: 100,
    status: 'APPROVED',
  },
  {
    id: 'as-3',
    examinationId: 'ex-3',
    name: 'Science CAT',
    type: 'CAT',
    subjectId: 'sub-sci',
    streamId: 'str-3a',
    termId: 't2',
    maxScore: 50,
    status: 'SUBMITTED',
  },
  {
    id: 'as-4',
    name: 'History Draft CAT',
    type: 'CAT',
    subjectId: 'sub-hist',
    streamId: 'str-3b',
    termId: 't2',
    maxScore: 40,
    status: 'DRAFT',
  },
]

export const marks: Mark[] = []

export const feeStructures: FeeStructure[] = [
  {
    id: 'fs-1',
    name: 'Form 3 Day Fees',
    academicYearId: 'ay-2025',
    classId: 'cls-f3',
    items: [
      { name: 'Tuition', amount: 4500 },
      { name: 'Examination', amount: 350 },
      { name: 'Library', amount: 120 },
      { name: 'Sports', amount: 180 },
    ],
  },
  {
    id: 'fs-2',
    name: 'Form 4 Day Fees',
    academicYearId: 'ay-2025',
    classId: 'cls-f4',
    items: [
      { name: 'Tuition', amount: 4800 },
      { name: 'Examination', amount: 400 },
      { name: 'Library', amount: 120 },
      { name: 'Career Guidance', amount: 150 },
    ],
  },
]

export const invoices: Invoice[] = []

export const payments: Payment[] = []

export const announcements: Announcement[] = [
  {
    id: 'an-1',
    title: 'Term 2 Parent Conference',
    body: 'Parent-teacher conferences will be held in the main hall from 9:00–15:00.',
    audience: ['Parents', 'Teachers'],
    status: 'PUBLISHED',
    publishedAt: '2026-09-01T08:00:00',
    author: 'Caxton Nyathi',
  },
  {
    id: 'an-2',
    title: 'Library Week',
    body: 'Join reading clubs and book fairs all week in the learning commons.',
    audience: ['Students', 'Teachers'],
    status: 'PUBLISHED',
    publishedAt: '2026-09-10T09:00:00',
    author: 'Sarah Bennett',
  },
  {
    id: 'an-3',
    title: 'Fee Reminder Draft',
    body: 'Friendly reminder for outstanding Term 2 balances.',
    audience: ['Parents'],
    status: 'DRAFT',
    author: 'Finance Office',
  },
]

export const libraryBooks: LibraryBook[] = [
  {
    id: 'bk-1',
    title: 'Introduction to Algebra',
    author: 'L. Reed',
    category: 'Mathematics',
    isbn: '978-1-111-11111-1',
    copies: 12,
    available: 7,
  },
  {
    id: 'bk-2',
    title: 'World History Pathways',
    author: 'A. Campos',
    category: 'History',
    isbn: '978-1-222-22222-2',
    copies: 8,
    available: 2,
  },
  {
    id: 'bk-3',
    title: 'Creative Coding',
    author: 'M. Park',
    category: 'Computer Science',
    isbn: '978-1-333-33333-3',
    copies: 10,
    available: 10,
  },
]

export const libraryLoans: LibraryLoan[] = []

export const inventoryItems: InventoryItem[] = [
  {
    id: 'invt-1',
    name: 'Science Lab Microscope',
    category: 'Equipment',
    sku: 'SCI-MIC-01',
    quantity: 18,
    location: 'Lab Store A',
    supplier: 'EduSupply Co.',
  },
  {
    id: 'invt-2',
    name: 'Football Kit Set',
    category: 'Sports',
    sku: 'PE-FB-12',
    quantity: 40,
    location: 'Sports Store',
    supplier: 'PlayField Ltd',
  },
  {
    id: 'invt-3',
    name: 'A4 Printing Paper',
    category: 'Consumables',
    sku: 'OFF-PAP-A4',
    quantity: 120,
    location: 'Admin Store',
    supplier: 'OfficeMart',
  },
]

export const transportRoutes: TransportRoute[] = [
  {
    id: 'tr-1',
    name: 'North Circuit',
    vehicle: 'Bus VHS-01',
    driver: 'Samuel K.',
    fee: 450,
    studentIds: [],
  },
  {
    id: 'tr-2',
    name: 'Lake District',
    vehicle: 'Bus VHS-02',
    driver: 'Helen R.',
    fee: 520,
    studentIds: [],
  },
  {
    id: 'tr-3',
    name: 'Hillcrest Loop',
    vehicle: 'Van VHS-05',
    driver: 'Ibrahim M.',
    fee: 380,
    studentIds: [],
  },
]

export const appUsers: AppUser[] = [
  {
    id: 'u-admin',
    name: 'Caxton Nyathi',
    email: 'admin@viste.school',
    role: 'SCHOOL_ADMIN',
    status: 'ACTIVE',
    lastLogin: '2026-09-15T07:50:00',
  },
  {
    id: 'u-teacher',
    name: 'Teacher Portal',
    email: 'teacher@viste.school',
    role: 'TEACHER',
    status: 'ACTIVE',
  },
  {
    id: 'u-parent',
    name: 'Parent Portal',
    email: 'parent@viste.school',
    role: 'PARENT',
    status: 'ACTIVE',
  },
  {
    id: 'u-student',
    name: 'Student Portal',
    email: 'student@viste.school',
    role: 'STUDENT',
    status: 'ACTIVE',
  },
]

export const permissionCatalog = [
  'students.view',
  'students.create',
  'students.update',
  'students.delete',
  'fees.view',
  'fees.create',
  'fees.record_payment',
  'attendance.view',
  'attendance.record',
  'results.view',
  'results.enter',
  'results.approve',
  'results.publish',
  'users.view',
  'users.create',
  'users.update',
  'reports.view',
  'reports.export',
  'system.settings',
]

export const rolePermissions: RolePermission[] = [
  {
    role: 'SCHOOL_ADMIN',
    permissions: [...permissionCatalog],
  },
  {
    role: 'TEACHER',
    permissions: [
      'students.view',
      'attendance.view',
      'attendance.record',
      'results.view',
      'results.enter',
      'reports.view',
    ],
  },
  {
    role: 'ACCOUNTANT',
    permissions: ['students.view', 'fees.view', 'fees.create', 'fees.record_payment', 'reports.view', 'reports.export'],
  },
  {
    role: 'PARENT',
    permissions: ['students.view', 'fees.view', 'attendance.view', 'results.view'],
  },
  {
    role: 'STUDENT',
    permissions: ['attendance.view', 'results.view', 'fees.view'],
  },
]

export const auditLogs: AuditLog[] = []

export const dashboardStats: DashboardStats = {
  totalStudents: students.filter((s) => s.status === 'ACTIVE').length,
  totalTeachers: staff.filter((s) => s.status === 'ACTIVE').length,
  todayAttendancePct: 0,
  outstandingFees: invoices.reduce((sum, i) => sum + (i.total - i.paid), 0),
  feesCollected: payments
    .filter((p) => p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + p.amount, 0),
  pendingResults: assessments.filter((a) =>
    ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(a.status),
  ).length,
}

export const enrollmentTrend: EnrollmentPoint[] = [
  { month: 'Apr', students: 0 },
  { month: 'May', students: 0 },
  { month: 'Jun', students: 0 },
  { month: 'Jul', students: 0 },
  { month: 'Aug', students: 0 },
  { month: 'Sep', students: 0 },
]

export const attendanceOverview = [
  { name: 'Present', value: 0 },
  { name: 'Late', value: 0 },
  { name: 'Absent', value: 0 },
  { name: 'Excused', value: 0 },
]

export const feeCollectionSeries = [
  { month: 'Apr', collected: 0, outstanding: 0 },
  { month: 'May', collected: 0, outstanding: 0 },
  { month: 'Jun', collected: 0, outstanding: 0 },
  { month: 'Jul', collected: 0, outstanding: 0 },
  { month: 'Aug', collected: 0, outstanding: 0 },
  { month: 'Sep', collected: 0, outstanding: 0 },
]

export const performanceSeries = [
  { subject: 'Math', average: 0 },
  { subject: 'English', average: 0 },
  { subject: 'Science', average: 0 },
  { subject: 'History', average: 0 },
  { subject: 'CS', average: 0 },
]

export const resultPortals: ResultPortalView[] = []

export const recentActivities: {
  id: string
  title: string
  detail: string
  at: string
}[] = []
