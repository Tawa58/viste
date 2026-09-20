import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { getFirestoreDb, ensureFirebaseAuth } from '@/services/firebase/app'
import type {
  Guardian,
  Invoice,
  Mark,
  Payment,
  SchoolClass,
  Staff,
  Stream,
  Student,
  Subject,
  AttendanceRecord,
  Assessment,
} from '@/types'

function db(): Firestore {
  return getFirestoreDb()
}

async function listCollection<T>(path: string): Promise<T[]> {
  await ensureFirebaseAuth()
  const snap = await getDocs(collection(db(), path))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)
}

async function getById<T>(path: string, id: string): Promise<T | undefined> {
  await ensureFirebaseAuth()
  const snap = await getDoc(doc(db(), path, id))
  if (!snap.exists()) return undefined
  return { id: snap.id, ...snap.data() } as T
}

/** Structural catalog only — no placeholder students/teachers. */
const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'sub-math', code: 'MATH', name: 'Mathematics', category: 'Core' },
  { id: 'sub-eng', code: 'ENG', name: 'English', category: 'Core' },
  { id: 'sub-sci', code: 'SCI', name: 'Science', category: 'Core' },
  { id: 'sub-hist', code: 'HIST', name: 'History', category: 'Humanities' },
  { id: 'sub-geo', code: 'GEO', name: 'Geography', category: 'Humanities' },
  { id: 'sub-cs', code: 'CS', name: 'Computer Science', category: 'STEM' },
  { id: 'sub-pe', code: 'PE', name: 'Physical Education', category: 'Co-curricular' },
  { id: 'sub-art', code: 'ART', name: 'Art & Design', category: 'Co-curricular' },
]

const DEFAULT_CLASSES: SchoolClass[] = [
  { id: 'cls-f1', name: 'Form 1', level: 'Form 1', academicYearId: 'ay-2025' },
  { id: 'cls-f2', name: 'Form 2', level: 'Form 2', academicYearId: 'ay-2025' },
  { id: 'cls-f3', name: 'Form 3', level: 'Form 3', academicYearId: 'ay-2025' },
  { id: 'cls-f4', name: 'Form 4', level: 'Form 4', academicYearId: 'ay-2025' },
]

const DEFAULT_STREAMS: Stream[] = [
  { id: 'str-1a', classId: 'cls-f1', name: '1A', capacity: 35 },
  { id: 'str-1b', classId: 'cls-f1', name: '1B', capacity: 35 },
  { id: 'str-2a', classId: 'cls-f2', name: '2A', capacity: 35 },
  { id: 'str-2b', classId: 'cls-f2', name: '2B', capacity: 35 },
  { id: 'str-3a', classId: 'cls-f3', name: '3A', capacity: 32 },
  { id: 'str-3b', classId: 'cls-f3', name: '3B', capacity: 32 },
  { id: 'str-4a', classId: 'cls-f4', name: '4A', capacity: 30 },
  { id: 'str-4b', classId: 'cls-f4', name: '4B', capacity: 30 },
]

let catalogReady: Promise<void> | null = null

/**
 * Ensures academic structure exists in Firestore.
 * Does NOT seed students, staff, guardians, or chart placeholder series.
 */
export async function ensureSchoolCatalog(): Promise<void> {
  if (!catalogReady) {
    catalogReady = (async () => {
      await ensureFirebaseAuth()
      const subjectsSnap = await getDocs(collection(db(), 'subjects'))
      if (subjectsSnap.empty) {
        const batch = writeBatch(db())
        for (const s of DEFAULT_SUBJECTS) batch.set(doc(db(), 'subjects', s.id), s)
        for (const c of DEFAULT_CLASSES) batch.set(doc(db(), 'classes', c.id), c)
        for (const s of DEFAULT_STREAMS) batch.set(doc(db(), 'streams', s.id), s)
        batch.set(doc(db(), 'academicYears', 'ay-2025'), {
          id: 'ay-2025',
          name: '2025/2026',
          startDate: '2025-09-01',
          endDate: '2026-08-31',
          isCurrent: true,
        })
        await batch.commit()
      }
    })()
  }
  await catalogReady
}

export const firestoreSchool = {
  ensureSchoolCatalog,

  listStudents: () => listCollection<Student>('students'),
  getStudent: (id: string) => getById<Student>('students', id),
  async createStudent(input: Omit<Student, 'id'>): Promise<Student> {
    await ensureFirebaseAuth()
    const id = `stu_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
    const row: Student = { ...input, id }
    await setDoc(doc(db(), 'students', id), row)
    return row
  },
  async updateStudent(id: string, patch: Partial<Omit<Student, 'id'>>): Promise<Student> {
    await ensureFirebaseAuth()
    const current = await getById<Student>('students', id)
    if (!current) throw new Error('Student not found')
    const next = { ...current, ...patch, id }
    await setDoc(doc(db(), 'students', id), next)
    return next
  },

  listStaff: () => listCollection<Staff>('staff'),
  getStaff: (id: string) => getById<Staff>('staff', id),
  async createStaff(input: Omit<Staff, 'id'>): Promise<Staff> {
    await ensureFirebaseAuth()
    const id = `st_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
    const row: Staff = { ...input, id }
    await setDoc(doc(db(), 'staff', id), row)
    return row
  },
  async updateStaff(id: string, patch: Partial<Omit<Staff, 'id'>>): Promise<Staff> {
    await ensureFirebaseAuth()
    const current = await getById<Staff>('staff', id)
    if (!current) throw new Error('Staff not found')
    const next = { ...current, ...patch, id }
    await setDoc(doc(db(), 'staff', id), next)
    return next
  },

  listGuardians: () => listCollection<Guardian>('guardians'),
  getGuardian: (id: string) => getById<Guardian>('guardians', id),
  async updateGuardian(id: string, patch: Partial<Omit<Guardian, 'id'>>): Promise<Guardian> {
    await ensureFirebaseAuth()
    const current = await getById<Guardian>('guardians', id)
    if (!current) throw new Error('Guardian not found')
    const next = { ...current, ...patch, id }
    await setDoc(doc(db(), 'guardians', id), next)
    return next
  },
  async createGuardian(input: Omit<Guardian, 'id'>): Promise<Guardian> {
    await ensureFirebaseAuth()
    const id = `g_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
    const row: Guardian = { ...input, id }
    await setDoc(doc(db(), 'guardians', id), row)
    return row
  },

  listClasses: () => listCollection<SchoolClass>('classes'),
  listStreams: () => listCollection<Stream>('streams'),
  listSubjects: () => listCollection<Subject>('subjects'),
  listYears: () =>
    listCollection<{
      id: string
      name: string
      startDate: string
      endDate: string
      isCurrent: boolean
    }>('academicYears'),
  listAttendance: () => listCollection<AttendanceRecord>('attendance'),
  listInvoices: () => listCollection<Invoice>('invoices'),
  listPayments: () => listCollection<Payment>('payments'),
  listMarks: () => listCollection<Mark>('marks'),
  listAssessments: () => listCollection<Assessment>('assessments'),

  async deleteStudent(id: string) {
    await deleteDoc(doc(db(), 'students', id))
  },
}
