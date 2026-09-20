import 'server-only'

import { getAdminDb } from '@/lib/firebase/admin'
import type { UserRole } from '@/types'

export type AuditInput = {
  actorId: string
  actorRole: UserRole
  action: string
  entityType: string
  entityId: string
  requestId?: string
  metadata?: Record<string, unknown>
  status?: 'SUCCESS' | 'FAILED' | 'WARNING'
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  const db = getAdminDb()
  const id = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  await db.collection('auditLogs').doc(id).set({
    id,
    user: input.actorId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    module: input.entityType,
    entityType: input.entityType,
    entityId: input.entityId,
    record: `${input.entityType}:${input.entityId}`,
    status: input.status ?? 'SUCCESS',
    at: new Date().toISOString(),
    requestId: input.requestId ?? null,
    metadata: input.metadata ?? null,
  })
}
