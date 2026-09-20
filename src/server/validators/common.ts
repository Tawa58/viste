import { z } from 'zod'

/** Opaque pagination cursor (document id or encoded token). */
export const cursorSchema = z.string().min(1).max(512).optional()

/** Page size — coerced from query strings; hard cap 100. */
export const limitSchema = z.coerce.number().int().min(1).max(100).default(50)

export const paginationSchema = z.object({
  cursor: cursorSchema,
  limit: limitSchema,
})

export type PaginationInput = z.infer<typeof paginationSchema>

/** Firestore / entity document id. */
export const idSchema = z
  .string()
  .min(1, 'id is required')
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, 'id contains invalid characters')

export const optionalIdSchema = idSchema.optional()

export const emailSchema = z.string().trim().email().max(254)

export const isoDateSchema = z
  .string()
  .min(4)
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date')
