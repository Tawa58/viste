import 'server-only'

import { getAdminDb } from '@/lib/firebase/admin'
import type { UserRole } from '@/types'

export type AuditInput = {
  actorId: string
  actorRole: UserRole
  actorName?: string
  actorEmail?: string
  action: string
  entityType: string
  entityId: string
  requestId?: string
  metadata?: Record<string, unknown>
  status?: 'SUCCESS' | 'FAILED' | 'WARNING'
  summary?: string
}

function defaultSummary(input: AuditInput): string {
  const who = input.actorName || input.actorEmail || input.actorId
  if (input.action === 'auth.login') return `${who} signed in`
  if (input.action === 'auth.logout') return `${who} signed out`
  if (input.action === 'auth.login_failed') return `Failed sign-in attempt${input.actorEmail ? ` for ${input.actorEmail}` : ''}`
  return `${who} · ${input.action.replaceAll('.', ' ')} · ${input.entityType}`
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  const db = getAdminDb()
  const id = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const summary = input.summary || defaultSummary(input)
  await db.collection('auditLogs').doc(id).set({
    id,
    user: input.actorName || input.actorEmail || input.actorId,
    actorId: input.actorId,
    actorName: input.actorName ?? null,
    actorEmail: input.actorEmail ?? null,
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
    summary,
  })
}
