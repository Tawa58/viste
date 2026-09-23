import 'server-only'

import { writeAuditLog } from '@/server/audit/logger'
import type { SessionContext } from '@/server/auth/session'
import { requirePermission } from '@/server/authorization/permissions'
import { conflict, notFound } from '@/server/errors'
import { getDoc, newId, queryCollection, setDoc, deleteDoc } from '@/server/repositories/firestore-repo'
import type {
  TransportPaymentCreateInput,
  TransportRiderCreateInput,
  TransportRiderUpdateInput,
  TransportRouteCreateInput,
  TransportRouteUpdateInput,
  TransportVehicleCreateInput,
  TransportVehicleUpdateInput,
} from '@/server/validators/ops'
import type {
  TransportPayment,
  TransportRider,
  TransportRoute,
  TransportStop,
  TransportVehicle,
} from '@/types'

function empty(value?: string | null) {
  const v = value?.trim()
  return v ? v : undefined
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeStops(stops?: TransportStop[] | null): TransportStop[] {
  if (!stops?.length) return []
  return stops
    .map((s, i) => ({
      id: s.id || newId('stop'),
      name: (s.name || '').trim(),
      pickupTime: s.pickupTime || '06:30',
      dropTime: s.dropTime || '16:00',
      order: s.order ?? i,
    }))
    .filter((s) => s.name)
    .sort((a, b) => a.order - b.order)
}

function normalizeRoute(row: TransportRoute): TransportRoute {
  return {
    ...row,
    vehicleId: empty(row.vehicleId),
    vehicle: row.vehicle || '',
    driver: row.driver || '',
    driverPhone: empty(row.driverPhone),
    fee: Math.max(0, Number(row.fee) || 0),
    stops: normalizeStops(row.stops),
    studentIds: row.studentIds ?? [],
    active: row.active ?? true,
  }
}

function normalizeVehicle(row: TransportVehicle): TransportVehicle {
  return {
    ...row,
    registrationNumber: (row.registrationNumber || '').trim().toUpperCase(),
    capacity: Math.max(1, Number(row.capacity) || 1),
    type: row.type || 'BUS',
    status: row.status || 'ACTIVE',
    notes: empty(row.notes),
  }
}

function normalizeRider(row: TransportRider): TransportRider {
  return {
    ...row,
    monthlyFee: Math.max(0, Number(row.monthlyFee) || 0),
    status: row.status || 'ACTIVE',
    startedAt: row.startedAt || today(),
    endedAt: empty(row.endedAt),
    notes: empty(row.notes),
  }
}

function normalizePayment(row: TransportPayment): TransportPayment {
  return {
    ...row,
    amount: Math.max(0, Number(row.amount) || 0),
    method: row.method || 'Cash',
    receiptNumber: empty(row.receiptNumber),
    recordedBy: empty(row.recordedBy),
    notes: empty(row.notes),
  }
}

export async function listTransportRoutes(session: SessionContext): Promise<TransportRoute[]> {
  requirePermission(session, 'students.read')
  const rows = await queryCollection<TransportRoute>('transportRoutes', {
    limit: 100,
    orderBy: 'name',
  })
  return rows.map(normalizeRoute)
}

export async function createTransportRoute(
  session: SessionContext,
  input: TransportRouteCreateInput,
  requestId?: string,
): Promise<TransportRoute> {
  requirePermission(session, 'students.read')
  const id = newId('tr')
  let vehicleLabel = (input.vehicle || '').trim()
  if (input.vehicleId) {
    const v = await getDoc<TransportVehicle>('transportVehicles', input.vehicleId)
    if (v) vehicleLabel = `${v.name} (${v.registrationNumber})`
  }
  const row = normalizeRoute({
    id,
    name: input.name.trim(),
    vehicleId: empty(input.vehicleId),
    vehicle: vehicleLabel,
    driver: input.driver.trim(),
    driverPhone: empty(input.driverPhone),
    fee: input.fee,
    stops: (input.stops || []).map((s, i) => ({
      id: s.id || newId('stop'),
      name: s.name,
      pickupTime: s.pickupTime,
      dropTime: s.dropTime,
      order: s.order ?? i,
    })),
    studentIds: [],
    active: input.active ?? true,
  })
  await setDoc('transportRoutes', id, { ...row })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'transport.route.create',
    entityType: 'transportRoutes',
    entityId: id,
    requestId,
  })
  return row
}

export async function updateTransportRoute(
  session: SessionContext,
  id: string,
  patch: TransportRouteUpdateInput,
  requestId?: string,
): Promise<TransportRoute> {
  requirePermission(session, 'students.read')
  const current = await getDoc<TransportRoute>('transportRoutes', id)
  if (!current) throw notFound('Route not found')
  let vehicleLabel = patch.vehicle !== undefined ? patch.vehicle.trim() : current.vehicle
  const vehicleId =
    patch.vehicleId !== undefined ? empty(patch.vehicleId) : current.vehicleId
  if (vehicleId && (patch.vehicleId !== undefined || !vehicleLabel)) {
    const v = await getDoc<TransportVehicle>('transportVehicles', vehicleId)
    if (v) vehicleLabel = `${v.name} (${v.registrationNumber})`
  }
  const next = normalizeRoute({
    ...current,
    ...patch,
    id,
    name: patch.name?.trim() ?? current.name,
    vehicleId,
    vehicle: vehicleLabel,
    driver: patch.driver?.trim() ?? current.driver,
    driverPhone:
      patch.driverPhone !== undefined ? empty(patch.driverPhone) : current.driverPhone,
    stops: patch.stops
      ? patch.stops.map((s, i) => ({
          id: s.id || newId('stop'),
          name: s.name,
          pickupTime: s.pickupTime,
          dropTime: s.dropTime,
          order: s.order ?? i,
        }))
      : current.stops,
  })
  await setDoc('transportRoutes', id, { ...next })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'transport.route.update',
    entityType: 'transportRoutes',
    entityId: id,
    requestId,
  })
  return next
}

export async function deleteTransportRoute(
  session: SessionContext,
  id: string,
  requestId?: string,
): Promise<void> {
  requirePermission(session, 'students.read')
  const current = await getDoc<TransportRoute>('transportRoutes', id)
  if (!current) throw notFound('Route not found')
  await deleteDoc('transportRoutes', id)
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'transport.route.delete',
    entityType: 'transportRoutes',
    entityId: id,
    requestId,
  })
}

export async function listTransportVehicles(session: SessionContext): Promise<TransportVehicle[]> {
  requirePermission(session, 'students.read')
  const rows = await queryCollection<TransportVehicle>('transportVehicles', {
    limit: 100,
    orderBy: 'name',
  })
  return rows.map(normalizeVehicle)
}

export async function createTransportVehicle(
  session: SessionContext,
  input: TransportVehicleCreateInput,
  requestId?: string,
): Promise<TransportVehicle> {
  requirePermission(session, 'students.read')
  const id = newId('bus')
  const row = normalizeVehicle({
    id,
    name: input.name.trim(),
    registrationNumber: input.registrationNumber.trim(),
    capacity: input.capacity ?? 30,
    type: input.type ?? 'BUS',
    status: input.status ?? 'ACTIVE',
    notes: empty(input.notes),
  })
  await setDoc('transportVehicles', id, { ...row })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'transport.vehicle.create',
    entityType: 'transportVehicles',
    entityId: id,
    requestId,
  })
  return row
}

export async function updateTransportVehicle(
  session: SessionContext,
  id: string,
  patch: TransportVehicleUpdateInput,
  requestId?: string,
): Promise<TransportVehicle> {
  requirePermission(session, 'students.read')
  const current = await getDoc<TransportVehicle>('transportVehicles', id)
  if (!current) throw notFound('Vehicle not found')
  const next = normalizeVehicle({
    ...current,
    ...patch,
    id,
    name: patch.name?.trim() ?? current.name,
    registrationNumber: patch.registrationNumber?.trim() ?? current.registrationNumber,
    notes: patch.notes !== undefined ? empty(patch.notes) : current.notes,
  })
  await setDoc('transportVehicles', id, { ...next })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'transport.vehicle.update',
    entityType: 'transportVehicles',
    entityId: id,
    requestId,
  })
  return next
}

export async function listTransportRiders(session: SessionContext): Promise<TransportRider[]> {
  requirePermission(session, 'students.read')
  const rows = await queryCollection<TransportRider>('transportRiders', { limit: 100 })
  return rows.map(normalizeRider)
}

export async function createTransportRider(
  session: SessionContext,
  input: TransportRiderCreateInput,
  requestId?: string,
): Promise<TransportRider> {
  requirePermission(session, 'students.read')
  const route = await getDoc<TransportRoute>('transportRoutes', input.routeId)
  if (!route) throw notFound('Route not found')
  const existing = await queryCollection<TransportRider>('transportRiders', { limit: 100 })
  if (existing.some((r) => r.studentId === input.studentId && r.routeId === input.routeId && r.status === 'ACTIVE')) {
    throw conflict('Student is already on this route')
  }
  const id = newId('trd')
  const row = normalizeRider({
    id,
    studentId: input.studentId,
    routeId: input.routeId,
    monthlyFee: input.monthlyFee ?? route.fee,
    status: input.status ?? 'ACTIVE',
    startedAt: input.startedAt || today(),
    notes: empty(input.notes),
  })
  await setDoc('transportRiders', id, { ...row })
  const nextIds = Array.from(new Set([...(route.studentIds || []), input.studentId]))
  await setDoc('transportRoutes', route.id, { ...normalizeRoute(route), studentIds: nextIds })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'transport.rider.create',
    entityType: 'transportRiders',
    entityId: id,
    requestId,
  })
  return row
}

export async function updateTransportRider(
  session: SessionContext,
  id: string,
  patch: TransportRiderUpdateInput,
  requestId?: string,
): Promise<TransportRider> {
  requirePermission(session, 'students.read')
  const current = await getDoc<TransportRider>('transportRiders', id)
  if (!current) throw notFound('Rider not found')
  const next = normalizeRider({
    ...current,
    ...patch,
    id,
    endedAt: patch.endedAt !== undefined ? empty(patch.endedAt) : current.endedAt,
    notes: patch.notes !== undefined ? empty(patch.notes) : current.notes,
  })
  await setDoc('transportRiders', id, { ...next })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'transport.rider.update',
    entityType: 'transportRiders',
    entityId: id,
    requestId,
  })
  return next
}

export async function listTransportPayments(session: SessionContext): Promise<TransportPayment[]> {
  requirePermission(session, 'students.read')
  const rows = await queryCollection<TransportPayment>('transportPayments', {
    limit: 100,
    orderBy: 'paidAt',
    orderDirection: 'desc',
  })
  return rows.map(normalizePayment)
}

export async function createTransportPayment(
  session: SessionContext,
  input: TransportPaymentCreateInput,
  requestId?: string,
): Promise<TransportPayment> {
  requirePermission(session, 'students.read')
  const rider = await getDoc<TransportRider>('transportRiders', input.riderId)
  if (!rider) throw notFound('Rider not found')
  const id = newId('tpay')
  const row = normalizePayment({
    id,
    riderId: rider.id,
    studentId: rider.studentId,
    routeId: rider.routeId,
    amount: input.amount,
    month: input.month,
    paidAt: input.paidAt || today(),
    method: input.method || 'Cash',
    receiptNumber: empty(input.receiptNumber),
    recordedBy: session.uid,
    notes: empty(input.notes),
  })
  await setDoc('transportPayments', id, { ...row })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'transport.payment.create',
    entityType: 'transportPayments',
    entityId: id,
    requestId,
  })
  return row
}

export const listTransportRoutesService = listTransportRoutes
export const createTransportRouteService = createTransportRoute
export const updateTransportRouteService = updateTransportRoute
export const deleteTransportRouteService = deleteTransportRoute
export const listTransportVehiclesService = listTransportVehicles
export const createTransportVehicleService = createTransportVehicle
export const updateTransportVehicleService = updateTransportVehicle
export const listTransportRidersService = listTransportRiders
export const createTransportRiderService = createTransportRider
export const updateTransportRiderService = updateTransportRider
export const listTransportPaymentsService = listTransportPayments
export const createTransportPaymentService = createTransportPayment
