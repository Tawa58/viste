import 'server-only'

import { writeAuditLog } from '@/server/audit/logger'
import type { SessionContext } from '@/server/auth/session'
import { requirePermission } from '@/server/authorization/permissions'
import { notFound } from '@/server/errors'
import { getDoc, newId, queryCollection, setDoc, deleteDoc } from '@/server/repositories/firestore-repo'
import type { InventoryCreateInput, InventoryUpdateInput } from '@/server/validators/ops'
import type { InventoryAssetStatus, InventoryItem } from '@/types'

function empty(value?: string | null) {
  const v = value?.trim()
  return v ? v : undefined
}

function normalize(row: InventoryItem): InventoryItem {
  return {
    ...row,
    sku: row.sku || '',
    registrationNumber: empty(row.registrationNumber),
    quantity: Math.max(0, Number(row.quantity) || 0),
    location: row.location || '',
    supplier: row.supplier || '',
    purchaseValue: Math.max(0, Number(row.purchaseValue) || 0),
    purchaseDate: row.purchaseDate || new Date().toISOString().slice(0, 10),
    receiptFileId: empty(row.receiptFileId),
    status: (row.status as InventoryAssetStatus) || 'IN_STOCK',
    dispatchedTo: empty(row.dispatchedTo),
    dispatchedAt: empty(row.dispatchedAt),
    soldAmount: row.soldAmount != null ? Math.max(0, Number(row.soldAmount)) : undefined,
    soldAt: empty(row.soldAt),
    notes: empty(row.notes),
  }
}

export async function listInventory(session: SessionContext): Promise<InventoryItem[]> {
  requirePermission(session, 'settings.manage')
  const rows = await queryCollection<InventoryItem>('inventoryItems', {
    limit: 100,
    orderBy: 'name',
  })
  return rows.map(normalize)
}

export async function createInventoryItem(
  session: SessionContext,
  input: InventoryCreateInput,
  requestId?: string,
): Promise<InventoryItem> {
  requirePermission(session, 'settings.manage')
  const id = newId('inv')
  const now = new Date().toISOString()
  const row = normalize({
    id,
    name: input.name.trim(),
    category: input.category.trim(),
    sku: (input.sku || '').trim() || `AST-${id.slice(-6).toUpperCase()}`,
    registrationNumber: empty(input.registrationNumber),
    quantity: input.quantity ?? 1,
    location: (input.location || '').trim(),
    supplier: (input.supplier || '').trim(),
    purchaseValue: input.purchaseValue,
    purchaseDate: input.purchaseDate,
    receiptFileId: empty(input.receiptFileId),
    status: input.status ?? 'IN_STOCK',
    dispatchedTo: empty(input.dispatchedTo),
    dispatchedAt: empty(input.dispatchedAt),
    soldAmount: input.soldAmount,
    soldAt: empty(input.soldAt),
    notes: empty(input.notes),
    createdAt: now,
    updatedAt: now,
  })
  await setDoc('inventoryItems', id, { ...row })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'inventory.create',
    entityType: 'inventoryItems',
    entityId: id,
    requestId,
  })
  return row
}

export async function updateInventoryItem(
  session: SessionContext,
  id: string,
  patch: InventoryUpdateInput,
  requestId?: string,
): Promise<InventoryItem> {
  requirePermission(session, 'settings.manage')
  const current = await getDoc<InventoryItem>('inventoryItems', id)
  if (!current) throw notFound('Asset not found')
  const next = normalize({
    ...current,
    ...patch,
    id,
    name: patch.name?.trim() ?? current.name,
    category: patch.category?.trim() ?? current.category,
    sku: patch.sku !== undefined ? patch.sku.trim() : current.sku,
    registrationNumber:
      patch.registrationNumber !== undefined
        ? empty(patch.registrationNumber)
        : current.registrationNumber,
    location: patch.location !== undefined ? patch.location.trim() : current.location,
    supplier: patch.supplier !== undefined ? patch.supplier.trim() : current.supplier,
    receiptFileId:
      patch.receiptFileId !== undefined ? empty(patch.receiptFileId) : current.receiptFileId,
    dispatchedTo:
      patch.dispatchedTo !== undefined ? empty(patch.dispatchedTo) : current.dispatchedTo,
    dispatchedAt:
      patch.dispatchedAt !== undefined ? empty(patch.dispatchedAt) : current.dispatchedAt,
    soldAt: patch.soldAt !== undefined ? empty(patch.soldAt) : current.soldAt,
    notes: patch.notes !== undefined ? empty(patch.notes) : current.notes,
    updatedAt: new Date().toISOString(),
  })
  await setDoc('inventoryItems', id, { ...next })
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'inventory.update',
    entityType: 'inventoryItems',
    entityId: id,
    requestId,
  })
  return next
}

export async function deleteInventoryItem(
  session: SessionContext,
  id: string,
  requestId?: string,
): Promise<void> {
  requirePermission(session, 'settings.manage')
  const current = await getDoc<InventoryItem>('inventoryItems', id)
  if (!current) throw notFound('Asset not found')
  await deleteDoc('inventoryItems', id)
  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'inventory.delete',
    entityType: 'inventoryItems',
    entityId: id,
    requestId,
  })
}

export const listInventoryService = listInventory
export const createInventoryItemService = createInventoryItem
export const updateInventoryItemService = updateInventoryItem
export const deleteInventoryItemService = deleteInventoryItem
