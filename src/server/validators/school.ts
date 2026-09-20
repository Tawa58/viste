import { z } from 'zod'
import { emailSchema, idSchema, isoDateSchema } from '@/server/validators/common'

export const studentStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'GRADUATED',
  'TRANSFERRED',
  'SUSPENDED',
])

export const studentCreateSchema = z.object({
  studentNumber: z.string().min(1).max(64),
  admissionNumber: z.string().min(1).max(64),
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
  streamId: idSchema,
  subjectIds: z.array(idSchema).default([]),
  guardianIds: z.array(idSchema).default([]),
  profilePhotoId: idSchema.optional(),
})

export const studentUpdateSchema = studentCreateSchema.partial()

export const guardianCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  relationship: z.string().min(1).max(80),
  email: emailSchema,
  phone: z.string().min(3).max(40),
  address: z.string().min(1).max(500),
  studentIds: z.array(idSchema).default([]),
  occupation: z.string().max(120).optional(),
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
  password: z.string().min(8).max(128),
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
})

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
