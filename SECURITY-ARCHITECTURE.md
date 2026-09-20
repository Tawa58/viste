# SECURITY-ARCHITECTURE.md — VISTE MGT

**Status:** `IMPLEMENTED` (server path) · `REQUIRES CONFIGURATION` (Admin credentials + rules deploy)  
**UI:** Unchanged visually; client calls `/api/v1` with Firebase ID token.

## Trust model

| Layer | Trust |
|-------|-------|
| Browser | **Untrusted** |
| Next.js `/api/v1` | **Authority** — verifies ID token, RBAC, validation, business rules |
| Firebase Admin → Firestore | Privileged data access (bypasses Security Rules) |
| Firestore Security Rules | Additional boundary — default deny for school data |

## Authentication

1. User signs in with Firebase Auth (email/password) in the browser.
2. Client sends `Authorization: Bearer <ID token>` to `/api/v1/*`.
3. Server: `admin.auth().verifyIdToken(token, true)`.
4. Anonymous tokens → **401**.
5. Profile/role loaded from `users/{uid}` via Admin SDK.
6. New profiles default to **`STUDENT`**, unless email ∈ `BOOTSTRAP_ADMIN_EMAILS` → `SUPER_ADMIN`.
7. Profile PATCH strips `role`, `staffId`, `studentId`, `guardianId`, `email`.

## Authorization (RBAC)

Central map: `src/server/authorization/permissions.ts`  
Enforced with `requirePerm(session, permission)` on every mutating/sensitive read.

Isolation: `src/server/authorization/isolation.ts`  
Parents/students only access linked student IDs (server-checked).

## Sensitive workflows

| Flow | Protection |
|------|------------|
| Payments | Server transaction; duplicate receipt; idempotency key; amount cannot exceed invoice; reverse permission |
| Invoice balances | Recalculated from CONFIRMED payments |
| Results portal | Auth + relationship + published + **fee clearance** (`isStudentFeeCleared`) |
| Result lifecycle | Permissioned transitions; lock blocks edits |
| Audit | `auditLogs` written server-side only |

## Secrets

Never put Admin credentials in `NEXT_PUBLIC_*`.  
Required server env: `FIREBASE_ADMIN_*` or `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`.

## What is still not production-complete

- File uploads still use client Firestore for `files/**` (authenticated only).
- In-memory rate limits (not multi-instance).
- Full automated API attack suite incomplete.
- Firestore PITR/backups must be enabled in Google Cloud (`REQUIRES CONFIGURATION`).
