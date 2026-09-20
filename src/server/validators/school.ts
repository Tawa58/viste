import { z } from 'zod'
import { emailSchema, idSchema, isoDateSchema } from '@/server/validators/common'

export const studentStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'GRADUATED',
  'TRANSFERRED',
  'SUSPENDED',
  'WITHDRAWN',
  'ARCHIVED',
])

export const studentCreateSchema = z.object({
  /** Optional on create — server assigns VHS-{year}-{001} when blank. */
  studentNumber: z.string().max(64).optional().or(z.literal('')),
  admissionNumber: z.string().max(64).optional().or(z.literal('')),
  firstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1).max(100),
  dateOfBirth: isoDateSchema,
  gender: z.enum(['Male', 'Female']),
  email: emailSchema.optional().or(z.literal('')),
  phone: z.string().max(40).optional(),
  address: z.string().min(1).max(500),
  admissionDate: isoDateSchema,
  status: studentStatusSchema.default('ACTIVE'),
  classId: idSchema,
  streamId: idSchema.optional().or(z.literal('')),
  educationLevelId: z.string().min(1).max(40).optional(),
  academicYearId: idSchema.optional(),
  termId: idSchema.optional(),
  subjectIds: z.array(idSchema).default([]),
  sportIds: z.array(idSchema).default([]),
  clubIds: z.array(idSchema).default([]),
  houseId: idSchema.optional().or(z.literal('')),
  guardianIds: z.array(idSchema).default([]),
  profilePhotoId: idSchema.optional(),
  /** Inline guardians created during registration (optional). */
  newGuardians: z
    .array(
      z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        relationship: z.string().min(1).max(80),
        email: emailSchema.optional().or(z.literal('')),
        phone: z.string().min(3).max(40),
        address: z.string().max(500).optional(),
        occupation: z.string().max(120).optional(),
        emergencyContact: z.boolean().optional(),
      }),
    )
    .optional(),
})

export const studentUpdateSchema = studentCreateSchema
  .omit({ newGuardians: true })
  .partial()

export const classStatusSchema = z.enum(['ACTIVE', 'ARCHIVED'])

export const classCreateSchema = z.object({
  name: z.string().min(1).max(120),
  educationLevelId: z.string().min(1).max(40),
  /** Optional — server uses the current academic year when omitted. */
  academicYearId: idSchema.optional().or(z.literal('')),
  termId: idSchema.optional().or(z.literal('')),
  /** Preferred: Term 1 / 2 / 3 — resolved against the academic year. */
  termSequence: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  classTeacherId: idSchema.optional().or(z.literal('')),
  subjectIds: z.array(idSchema).default([]),
  description: z.string().max(1000).optional(),
  capacity: z.number().int().min(1).max(200).optional(),
  status: classStatusSchema.default('ACTIVE'),
})

export const classUpdateSchema = classCreateSchema.partial()

export const subjectCreateSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(80),
  educationLevelIds: z.array(z.string().min(1).max(40)).default([]),
  teacherIds: z.array(idSchema).default([]),
  active: z.boolean().default(true),
})

export const subjectUpdateSchema = subjectCreateSchema.partial()

export const sportCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  active: z.boolean().default(true),
})

export const sportUpdateSchema = sportCreateSchema.partial()

export const clubCreateSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['CLUB', 'SOCIETY', 'ACTIVITY', 'OTHER']).default('CLUB'),
  description: z.string().max(500).optional(),
  active: z.boolean().default(true),
})

export const clubUpdateSchema = clubCreateSchema.partial()

export const houseCreateSchema = z.object({
  name: z.string().min(1).max(120),
  color: z.string().max(40).optional(),
  active: z.boolean().default(true),
})

export const houseUpdateSchema = houseCreateSchema.partial()

export const exemptionCreateSchema = z.object({
  studentId: idSchema,
  type: z.enum(['SUBJECT', 'SPORT', 'ACTIVITY', 'OTHER']),
  targetId: idSchema.optional().or(z.literal('')),
  targetLabel: z.string().min(1).max(160),
  reason: z.string().min(1).max(500),
  startDate: isoDateSchema,
  endDate: isoDateSchema.optional().or(z.literal('')),
  notes: z.string().max(1000).optional(),
})

export const transferStudentSchema = z.object({
  studentId: idSchema,
  toClassId: idSchema,
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  date: isoDateSchema.optional(),
})

export const guardianCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  relationship: z.string().min(1).max(80),
  email: emailSchema.optional().or(z.literal('')),
  phone: z.string().min(3).max(40),
  address: z.string().min(1).max(500).default('—'),
  studentIds: z.array(idSchema).default([]),
  occupation: z.string().max(120).optional(),
  emergencyContact: z.boolean().optional(),
})

export const guardianUpdateSchema = guardianCreateSchema.partial()

export const staffCreateSchema = z.object({
  employeeNumber: z.string().min(1).max(64),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: emailSchema,
  phone: z.string().min(3).max(40),
  department: z.string().min(1).max(120),
  title: z.string().min(1).max(120),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  subjectIds: z.array(idSchema).default([]),
  classIds: z.array(idSchema).default([]),
  hireDate: isoDateSchema,
  /** Optional — server auto-generates a temporary password when omitted. */
  password: z.string().min(8).max(128).optional(),
  profilePhotoId: idSchema.optional(),
})

export const staffUpdateSchema = staffCreateSchema
  .omit({ password: true })
  .partial()
  .extend({
    password: z.string().min(8).max(128).optional(),
  })

export const attendanceUpsertSchema = z.object({
  date: isoDateSchema,
  studentId: idSchema,
  classId: idSchema,
  streamId: idSchema,
  subjectId: idSchema.optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'AUTHORIZED_ABSENCE']),
  kind: z.enum(['DAILY', 'PERIOD']).optional(),
})

export const attendanceRegisterSchema = z.object({
  date: isoDateSchema,
  classId: idSchema,
  entries: z
    .array(
      z.object({
        studentId: idSchema,
        streamId: idSchema,
        status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
      }),
    )
    .min(1)
    .max(200),
})

export type AttendanceRegisterInput = z.infer<typeof attendanceRegisterSchema>

export const paymentCreateSchema = z.object({
  studentId: idSchema,
  invoiceId: idSchema,
  amount: z.number().positive().max(1_000_000),
  method: z.string().min(1).max(80),
  receiptNumber: z.string().min(1).max(80),
  paidAt: isoDateSchema.optional(),
  idempotencyKey: z.string().min(8).max(128).optional(),
})

export const markUpsertSchema = z.object({
  assessmentId: idSchema,
  studentId: idSchema,
  score: z.number().min(0).max(1000),
  grade: z.string().min(1).max(8),
})

/** Allowed forward transitions for mark/assessment workflow. */
export const resultTransitionSchema = z.object({
  status: z.enum(['SUBMITTED', 'APPROVED', 'PUBLISHED', 'LOCKED']),
})

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(40).optional(),
  title: z.string().max(120).optional(),
  department: z.string().max(120).optional(),
  bio: z.string().max(2000).optional(),
  preferredLanguage: z.enum(['en', 'sn', 'nd']).optional(),
  timezone: z.string().max(80).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  avatarFileId: z.string().optional().nullable(),
  notificationPrefs: z
    .object({
      email: z.boolean(),
      sms: z.boolean(),
      inApp: z.boolean(),
    })
    .optional(),
})

export type StudentCreateInput = z.infer<typeof studentCreateSchema>
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>
export type GuardianCreateInput = z.infer<typeof guardianCreateSchema>
export type StaffCreateInput = z.infer<typeof staffCreateSchema>
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>
export type MarkUpsertInput = z.infer<typeof markUpsertSchema>
export type ResultTransitionInput = z.infer<typeof resultTransitionSchema>
export type ClassCreateInput = z.infer<typeof classCreateSchema>
export type ClassUpdateInput = z.infer<typeof classUpdateSchema>
export type SubjectCreateInput = z.infer<typeof subjectCreateSchema>
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>
export type SportCreateInput = z.infer<typeof sportCreateSchema>
export type ClubCreateInput = z.infer<typeof clubCreateSchema>
export type HouseCreateInput = z.infer<typeof houseCreateSchema>
export type ExemptionCreateInput = z.infer<typeof exemptionCreateSchema>
export type TransferStudentInput = z.infer<typeof transferStudentSchema>
