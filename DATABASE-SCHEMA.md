# DATABASE-SCHEMA.md — VISTE MGT

**Project:** Viste High School Management System  
**Source of truth for this doc:** TypeScript domain types + client Firestore repositories (as of 2026-09-19)  
**Access today:** Browser Firebase client SDK (not Firebase Admin)  
**Security today:** `firestore.rules` is world-open — **CRITICAL**; schema alone is not protection  

Labels: `IN USE` · `TYPED BUT EMPTY LIVE` · `SEED-ONLY` · `PLANNED / NOT PERSISTED` · `MUST REMOVE OR HARDEN`

---

## 1. Overview

| Collection | Doc ID pattern | Status | Client ops |
|------------|----------------|--------|------------|
| `users` | Firebase Auth UID | `IN USE` | get/create/update |
| `students` | `stu_*` | `IN USE` | list/get/create/update (delete on repo unused) |
| `staff` | `st_*` | `IN USE` | list/get/create/update |
| `guardians` | `g_*` | `IN USE` | list/get/create/update |
| `classes` | e.g. `cls-f1` | `SEED-ONLY` | list + auto-seed |
| `streams` | e.g. `str-1a` | `SEED-ONLY` | list + auto-seed |
| `subjects` | e.g. `sub-math` | `SEED-ONLY` | list + auto-seed |
| `academicYears` | e.g. `ay-2025` | `SEED-ONLY` | list + auto-seed |
| `attendance` | app-defined | `IN USE` (read) | list only |
| `invoices` | app-defined | `IN USE` (read) | list only |
| `payments` | app-defined | `IN USE` (read) | list only |
| `assessments` | app-defined | `IN USE` (read) | list only |
| `marks` | app-defined | `IN USE` (read) | list only |
| `staffCredentials` | staff id | `IN USE` | **plaintext password — MUST HARDEN** |
| `files` | file id | `IN USE` | metadata CRUD |
| `files/{fileId}/chunks` | chunk id / index | `IN USE` | Base64 payloads |
| `terms` | — | `TYPED BUT EMPTY LIVE` | no writes |
| `examinations` | — | `TYPED BUT EMPTY LIVE` | no collection methods live |
| `feeStructures` / announcements / library / inventory / transport / auditLogs / notifications / settings / rolePermissions | — | `PLANNED / NOT PERSISTED` | live catalog returns `[]` |

**Relationships (logical):**

```
academicYears 1—* classes 1—* streams
students → classId, streamId, subjectIds[], guardianIds[]
guardians → studentIds[]
staff → subjectIds[], classIds[]
users ↔ staffId | studentId | guardianId (optional links)
assessments → subjectId, streamId, termId, examinationId?
marks → assessmentId, studentId
invoices / payments → studentId
files → ownerId + ownerType
```

---

## 2. Collection details

### 2.1 `users` — `IN USE`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | = Auth UID |
| `name` | string | yes | |
| `email` | string | yes | lowercased |
| `role` | UserRole | yes | **CRITICAL:** client-writable; defaults `SCHOOL_ADMIN` |
| `avatarUrl` / `avatarFileId` | string? | no | |
| `phone`, `title`, `department`, `employeeNumber`, `bio` | string? | no | |
| `staffId`, `studentId`, `guardianId` | string? | no | Cross-links |
| `preferredLanguage` | `'en'\|'sn'\|'nd'` | no | default `en` |
| `timezone` | string | no | default `Africa/Harare` |
| `notificationPrefs` | `{email,sms,inApp}` | no | |

**Authorization (target):** Admin-only role writes; users may update own non-privileged profile fields.  
**Authorization (today):** Anyone (open rules).  
**Lifecycle:** Created on first login (`getOrCreateUserProfile`).

---

### 2.2 `students` — `IN USE`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | yes |
| `studentNumber`, `admissionNumber` | string | yes |
| `firstName`, `lastName` | string | yes |
| `middleName` | string? | no |
| `dateOfBirth`, `admissionDate` | string (ISO date) | yes |
| `gender` | `'Male'\|'Female'` | yes |
| `email`, `phone` | string? | no |
| `address` | string | yes |
| `status` | StudentStatus | yes |
| `classId`, `streamId` | string | yes |
| `subjectIds` | string[] | yes |
| `guardianIds` | string[] | yes |
| `profilePhotoId` | string? | no — file ref only |

**IDs:** `stu_` + truncated UUID.  
**Archival:** Soft status preferred; hard `deleteStudent` exists but unused.  
**Isolation (target):** Student/parent scoped reads; teacher class-scoped.

---

### 2.3 `guardians` — `IN USE`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | yes (`g_*`) |
| `firstName`, `lastName`, `relationship` | string | yes |
| `email`, `phone`, `address` | string | yes |
| `studentIds` | string[] | yes |
| `occupation` | string? | no |

---

### 2.4 `staff` — `IN USE`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | yes (`st_*`) |
| `employeeNumber`, `firstName`, `lastName` | string | yes |
| `email`, `phone`, `department`, `title` | string | yes |
| `status` | `'ACTIVE'\|'INACTIVE'` | yes |
| `subjectIds`, `classIds` | string[] | yes |
| `hireDate` | string | yes |
| `profilePhotoId` | string? | no |
| `photoUrl` | string? | deprecated preview |

---

### 2.5 `staffCredentials` — `IN USE` / `MUST REMOVE OR HARDEN`

| Field | Type | Notes |
|-------|------|-------|
| Doc ID | staff id | |
| `staffId`, `email` | string | |
| `password` | string | **Plaintext — must not exist in production** |
| `role` | subset of UserRole | |
| `temporaryPassword` | boolean? | |
| `lastResetAt` | string? | |
| `authUid` | string? | set on create |

**Target:** Delete password field; Auth is sole credential store; Admin SDK for resets.

---

### 2.6 Catalog — `SEED-ONLY`

Triggered when `subjects` collection is empty (`ensureSchoolCatalog`).

| Collection | Seed examples |
|------------|---------------|
| `subjects` | MATH, ENG, SCI, HIST, GEO, CS, PE, ART |
| `classes` | Form 1–4 → `academicYearId: ay-2025` |
| `streams` | 1A/1B … 4A/4B with capacities |
| `academicYears` | `ay-2025` — 2025/2026 current |

No admin CRUD beyond seed; no `terms` seed.

---

### 2.7 Attendance / finance / marks — read collections

Shapes match `AttendanceRecord`, `Invoice`, `Payment`, `Assessment`, `Mark` in `src/types/index.ts`.

| Concern | Today | Target |
|---------|-------|--------|
| Writes | Not implemented in live services | Server transactions |
| Invoice `total` / `paid` | Stored fields; client-trusted if written | Server-calculated |
| Payment idempotency | None | Required |
| Mark workflow | `MarkWorkflowStatus` typed; UI mock | DRAFT→…→PUBLISHED→LOCK server FSM |

---

### 2.8 `files` + chunks — `IN USE`

**`files/{fileId}`:** `StoredFileMetadata` (name, mime, owner, syncStatus, chunkCount, …).  
**`files/{fileId}/chunks/{chunkId}`:** `{ index, dataBase64, byteLength }`.

Firebase Storage is **not** used.  
**Risk:** Large PII blobs in Firestore; open rules expose all file bytes.

---

## 3. Types without live persistence

Documented in TypeScript for UI/mock readiness; **no live Firestore writers** found:

- `Term`, `Examination`, `FeeStructure`, `Announcement`
- `LibraryBook`, `LibraryLoan`, `InventoryItem`, `TransportRoute`
- `AppUser`, `RolePermission`, `AuditLog`
- `ResultPortalView` (computed view model — must be server-authorized)

Result access states (target portal):  
`RESULTS_AVAILABLE` | `RESULTS_LOCKED_FEES` | `RESULTS_NOT_PUBLISHED` | `ACCOUNT_RESTRICTED`

---

## 4. Realtime Database (non-Firestore)

| Path | Purpose | Rules note |
|------|---------|------------|
| `syncStatus/files/{fileId}` | File offline sync | any authenticated write |
| `presence`, `onlineUsers`, `liveNotifications`, `liveDashboard`, `activeSessions` | Defined in rules | limited app usage |

---

## 5. Indexes

| Item | Status |
|------|--------|
| Composite indexes file | Not in `firebase.json` |
| Queries today | Mostly full-collection `getDocs` — **will not scale** |
| Target | Cursor pagination + indexes for student/class/date/invoice filters |

---

## 6. Archival / deletion strategy (actual vs target)

| Entity | Actual | Target |
|--------|--------|--------|
| Students | Hard delete helper unused; status field exists | Soft archive + audit |
| Files | Soft delete fields on metadata | Retain + Admin purge job |
| Audit logs | Not persisted | Append-only; no client write |
| Payments | Status includes `REVERSED` | Reverse via controlled endpoint only |

---

## 7. Ownership & authorization (target mapping)

| Data | Owner / scope |
|------|----------------|
| `users/{uid}` | Self (limited) + admin roles |
| Student record | Admin/registrar write; teacher read scoped; parent/student read linked only |
| Invoice/payment | Finance + admin; parent/student read own |
| Marks/results | Teacher enter scoped; approver/publisher roles; lock after publish |
| `staffCredentials` | Eliminate secrets; admin sees reset status only |
| `files` | Owner + elevated roles; never world-readable |

**Today:** None of the above is enforced in rules or server code.

---

## 8. Integrity statement

This schema document reflects **code-defined** collections and fields.

- It does **not** claim production Console data has been inventoried document-by-document (`NOT YET VERIFIED` against live project contents).
- It does **not** claim secure rules or Admin access patterns are in place.
- Duplicate collections should not be created until this map is migrated behind `/api/v1` + hardened rules.
