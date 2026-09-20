# OFFLINE-SYNC-ARCHITECTURE.md — VISTE MGT

**Status:** `PARTIAL` (files only) · school/finance/results offline authority **not** implemented

## Principle

Offline data is **temporary and non-authoritative**.  
The server (`/api/v1` + Admin) remains the source of truth when online.

## Implemented today

| Area | Behavior |
|------|----------|
| Profile photos / files | IndexedDB queue + Firestore `files` chunks + RTDB `syncStatus/files/*` |
| School CRUD / payments / results | Online API only — no offline mutation queue |

## Rules for future offline expansion

1. Queue must be scoped to authenticated uid/device.  
2. Sync must re-authenticate and pass server RBAC.  
3. Payments / result approvals / role changes must **never** finalize offline.  
4. Conflict detection required (server version / updatedAt).  
5. Duplicate submission protection (idempotency keys) required for finance.

## Explicit non-goals

- Treating offline payment as settled  
- Treating offline result publish as published  
- Bypassing fee-clearance while offline
