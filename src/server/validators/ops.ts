import { z } from 'zod'
import { idSchema, isoDateSchema } from '@/server/validators/common'

export const inventoryStatusSchema = z.enum([
  'IN_STOCK',
  'DISPATCHED',
  'SOLD',
  'WRITTEN_OFF',
])

export const inventoryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(80),
  sku: z.string().max(64).optional().or(z.literal('')),
  registrationNumber: z.string().max(80).optional().or(z.literal('')),
  quantity: z.coerce.number().int().min(0).max(100_000).default(1),
  location: z.string().max(200).optional().or(z.literal('')),
  supplier: z.string().max(200).optional().or(z.literal('')),
  purchaseValue: z.coerce.number().min(0).max(50_000_000),
  purchaseDate: isoDateSchema,
  receiptFileId: idSchema.optional().or(z.literal('')),
  status: inventoryStatusSchema.default('IN_STOCK'),
  dispatchedTo: z.string().max(200).optional().or(z.literal('')),
  dispatchedAt: isoDateSchema.optional().or(z.literal('')),
  soldAmount: z.coerce.number().min(0).max(50_000_000).optional(),
  soldAt: isoDateSchema.optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

export const inventoryUpdateSchema = inventoryCreateSchema.partial()

export type InventoryCreateInput = z.infer<typeof inventoryCreateSchema>
export type InventoryUpdateInput = z.infer<typeof inventoryUpdateSchema>

const stopSchema = z.object({
  id: z.string().max(64).optional(),
  name: z.string().min(1).max(120),
  pickupTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm'),
  dropTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm'),
  order: z.coerce.number().int().min(0).max(50).optional(),
})

export const transportRouteCreateSchema = z.object({
  name: z.string().min(1).max(120),
  vehicleId: idSchema.optional().or(z.literal('')),
  vehicle: z.string().max(120).optional().or(z.literal('')),
  driver: z.string().min(1).max(120),
  driverPhone: z.string().max(40).optional().or(z.literal('')),
  fee: z.coerce.number().min(0).max(1_000_000),
  stops: z.array(stopSchema).max(40).default([]),
  active: z.boolean().default(true),
})

export const transportRouteUpdateSchema = transportRouteCreateSchema.partial()

export const transportVehicleCreateSchema = z.object({
  name: z.string().min(1).max(120),
  registrationNumber: z.string().min(1).max(40),
  capacity: z.coerce.number().int().min(1).max(120).default(30),
  type: z.enum(['BUS', 'VAN', 'MINIBUS', 'OTHER']).default('BUS'),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'RETIRED']).default('ACTIVE'),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export const transportVehicleUpdateSchema = transportVehicleCreateSchema.partial()

export const transportRiderCreateSchema = z.object({
  studentId: idSchema,
  routeId: idSchema,
  monthlyFee: z.coerce.number().min(0).max(1_000_000).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'LEFT']).default('ACTIVE'),
  startedAt: isoDateSchema.optional(),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export const transportRiderUpdateSchema = z.object({
  routeId: idSchema.optional(),
  monthlyFee: z.coerce.number().min(0).max(1_000_000).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'LEFT']).optional(),
  endedAt: isoDateSchema.optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export const transportPaymentCreateSchema = z.object({
  riderId: idSchema,
  amount: z.coerce.number().positive().max(1_000_000),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM'),
  paidAt: isoDateSchema.optional(),
  method: z.string().min(1).max(80).default('Cash'),
  receiptNumber: z.string().max(80).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export type TransportRouteCreateInput = z.infer<typeof transportRouteCreateSchema>
export type TransportRouteUpdateInput = z.infer<typeof transportRouteUpdateSchema>
export type TransportVehicleCreateInput = z.infer<typeof transportVehicleCreateSchema>
export type TransportVehicleUpdateInput = z.infer<typeof transportVehicleUpdateSchema>
export type TransportRiderCreateInput = z.infer<typeof transportRiderCreateSchema>
export type TransportRiderUpdateInput = z.infer<typeof transportRiderUpdateSchema>
export type TransportPaymentCreateInput = z.infer<typeof transportPaymentCreateSchema>
