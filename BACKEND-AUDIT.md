# BACKEND-AUDIT.md — VISTE MGT (Viste High School Management System)

**Project:** Viste High School Management System (`VISTE MGT`)  
**Not:** Viste Online (separate CMS — out of scope)  
**Audit date:** 2026-09-19  
**Audit type:** Phase 1–2 repository audit (read-only; UI not modified)  
**Status legend:** `IMPLEMENTED` · `PARTIAL` · `MISSING` · `CRITICAL` · `REQUIRES CONFIGURATION` · `NOT YET VERIFIED`

---

## 1. Executive verdict

| Question | Answer |
|----------|--------|
| Is there a production server-authoritative backend? | **No** |
| Stack in use today | Next.js 15 SPA shell + React Router UI + Firebase Auth + **client** Firestore SDK |
| Next.js API Routes / Route Handlers | **MISSING** (`src/app/api` does not exist) |
| Firebase Admin SDK | **MISSING** (not in dependencies; no server usage) |
| Middleware / session gate | **MISSING** |
| Server RBAC | **MISSING** |
| Firestore Rules | **CRITICAL** — `allow read, write: if true` |
| Spring / Java | **Removed** (no `backend/` on disk) |
| Production-ready per master security criteria | **No** — critical gaps below |

**Actual request path today:**

```
Browser (untrusted)
  → Next.js catch-all (ssr:false) → React Router SPA
    → src/services/api facade
      → Firebase Auth (client) + Cloud Firestore (client SDK)
```

**Target path (not yet built):**

```
Browser → Next.js /api/v1 → Auth → RBAC → Validation → Services → Repositories → Firebase Admin → Firestore
```

---

## 2. Repository structure (as found)

### Root

| Path | Role |
|------|------|
| `src/` | Application source |
| `public/` | Static assets |
| `firestore.rules` | Firestore security rules (**open**) |
| `database.rules.json` | Realtime Database rules |
| `firebase.json` / `.firebaserc` | Firebase project wiring (`viste-school-db`) |
| `next.config.ts` / `vercel.json` | Next.js + Vercel deploy |
| `package.json` | Next + Firebase client; no `firebase-admin`; no test runner |
| `.env` / `.env.example` | Public Firebase config only (`NEXT_PUBLIC_*`) |
| `vite.config.ts` / `index.html` / `src/main.tsx` | Vite remnants (optional `dev:vite`) |
| `backend/` | **Absent** (Spring removed) |
| `middleware.ts` | **Absent** |
| `src/app/api/` | **Absent** |

### `src/` layout

```
src/
├── app/                 # Next App Router shell only
│   ├── layout.tsx
│   ├── globals.css
│   └── [[...slug]]/page.tsx   # dynamic import ClientApp, ssr:false
├── client-app.tsx       # Theme + AuthProvider + App
├── App.tsx              # React Router routes + UI guards
├── views/               # Page UIs (frozen visual layer)
├── components/          # UI + shared
├── contexts/            # auth-context, theme-provider
├── layouts/             # app-shell
├── lib/                 # env, roles, navigation, utils
├── mocks/               # demo/mock datasets
├── services/
│   ├── api/             # facade (mock vs live) — NOT HTTP server
│   ├── firebase/        # client SDK bootstrap + auth-service
│   ├── firestore/       # client repositories / services
│   └── files/           # chunked files in Firestore + offline queue
├── types/               # domain TypeScript types
├── hooks/
└── assets/
```

---

## 3. Technology inventory

| Area | Status | Notes |
|------|--------|-------|
| Next.js 15 App Router | `IMPLEMENTED` | Hosts SPA only |
| React + TypeScript | `IMPLEMENTED` | Strict TS; TS 6 + `noUncheckedSideEffectImports: false` |
| Tailwind CSS v4 | `IMPLEMENTED` | Via `@tailwindcss/postcss` |
| React Router | `IMPLEMENTED` | Client routing inside catch-all |
| Firebase Auth (client) | `IMPLEMENTED` | Email/password; anonymous fallback for catalog |
| Cloud Firestore (client) | `IMPLEMENTED` | Direct browser CRUD |
| Firebase Admin SDK | `MISSING` | Required for target architecture |
| Next.js API `/api/v1` | `MISSING` | |
| Server Actions | `MISSING` | |
| Zod request validation (server) | `MISSING` | Zod is a dependency (forms) but not server APIs |
| Automated tests | `MISSING` | No `*.test.*` / vitest / jest / playwright |
| Bootstrap CSS | Not used | Do not introduce |
| Java / Spring / Nest / Express / SQL / Mongo | Not present | Do not introduce |

---

## 4. Authentication audit

### Flow (`IMPLEMENTED` client-side)

1. Login → `FirebaseAuthService.login` → `signInWithEmailAndPassword`
2. `getOrCreateUserProfile(users/{uid})`
3. `AuthContext` stores user; persists JSON to `localStorage` / `sessionStorage` (`viste.auth.user`)
4. Route guards: `ProtectedRoute` (must have user), `RoleRoute` (`canAccessPath`) — **UI only**

### Findings

| Severity | Finding | Status |
|----------|---------|--------|
| **CRITICAL** | New / missing profiles default to `role: 'SCHOOL_ADMIN'` in `user-profile.ts` | Privilege escalation |
| **CRITICAL** | Roles stored as Firestore document fields; with open rules anyone can rewrite `users/{uid}.role` | Client-trusted identity attributes |
| **CRITICAL** | `updateUserProfile` merges `Partial<AuthUser>` including `role` (no server allowlist) | Role escalation |
| **HIGH** | `ensureFirebaseAuth()` may `signInAnonymously` when signed out (catalog bootstrap) | Broadens access if rules are only `auth != null` |
| **MEDIUM** | No Firebase custom claims; no server token verification | Target stack requires Admin `verifyIdToken` |
| **INFO** | Mock mode (`NEXT_PUBLIC_USE_MOCK_API=true`) uses in-memory demo credentials | Dev only |

### Staff account creation (`PARTIAL`)

- Secondary Firebase app creates Auth user without disrupting admin session — `IMPLEMENTED` (client)
- Writes `users/{uid}` as `TEACHER` + `staffCredentials` — `IMPLEMENTED` (client)
- Password reset updates **Firestore plaintext credential** only; Auth password change needs Admin SDK — **gap documented in code**

---

## 5. Authorization / RBAC audit

| Layer | Status |
|-------|--------|
| Client route matrix `src/lib/roles.ts` | `IMPLEMENTED` (presentation only) |
| Nav filtering `src/lib/navigation.ts` | `IMPLEMENTED` (presentation only) |
| File ACL helpers `src/services/files/permissions.ts` | `IMPLEMENTED` (client-enforced only) |
| Central permission catalog enforcement | `MISSING` — Users/Roles UI is “visual only”; Firestore returns `[]` |
| Server RBAC on every mutation | `MISSING` |
| Custom claims / Admin-mediated role assignment | `MISSING` |

### Roles in TypeScript (`src/types`)

`SUPER_ADMIN`, `SCHOOL_ADMIN`, `PRINCIPAL`, `TEACHER`, `ACCOUNTANT`, `FINANCE_OFFICER`, `REGISTRAR`, `RECEPTIONIST`, `LIBRARIAN`, `TRANSPORT_MANAGER`, `PARENT`, `STUDENT`

### Master-prompt initial roles (target)

`SUPER_ADMIN`, `SCHOOL_ADMIN`, `FINANCE`, `TEACHER`, `PARENT`, `STUDENT` — **map/align later**; do not delete existing UI role labels without a migration plan.

### Mock permissions (not enforced live)

Examples in `mocks/data.ts`: `students.*`, `fees.*`, `attendance.*`, `results.*`, `users.*`, `reports.*`, `system.settings`

---

## 6. Data access audit

### Pattern

Views → `authService` / `studentService` / `dashboardService` / `catalogService` → Firestore client repositories.  
Views do **not** import Firestore SDK directly (good separation for future API swap).

### Collections touched by client code

| Collection | Read | Write | Notes |
|------------|------|-------|-------|
| `users` | Yes | Yes | Profile + role |
| `students` | Yes | create/update | `deleteStudent` on repo unused by facade |
| `staff` | Yes | create/update | |
| `guardians` | Yes | create/update | |
| `classes` / `streams` / `subjects` / `academicYears` | Yes | seed if empty | No admin CRUD API |
| `attendance` | Yes | **No** | UI save is mock toast |
| `invoices` / `payments` | Yes | **No** | Record payment is mock |
| `marks` / `assessments` | Yes | **No** | Workflow UI is mock |
| `staffCredentials` | Yes | Yes | **Plaintext passwords** — CRITICAL |
| `files` + `files/{id}/chunks` | Yes | Yes | Base64 chunks; Storage unused |
| Terms, exams, fee structures, announcements, library, inventory, transport, app users, role permissions, audit logs, result portals | — | — | Live methods return `[]` |

### Realtime Database

Used for `syncStatus/files/{fileId}` (file offline queue). Rules require `auth != null` for several paths; `liveDashboard` / `syncStatus/files` writable by any authenticated user.

---

## 7. Module coverage matrix

| Module | UI (frozen) | Live data | Authoritative server CRUD | Notes |
|--------|-------------|-----------|---------------------------|-------|
| Login / session | Yes | Firebase Auth | `MISSING` | |
| Dashboard | Yes | Client aggregation | `MISSING` | |
| Students | Yes | Firestore CRUD | `MISSING` | |
| Teachers / staff | Yes | Firestore + Auth create | `MISSING` | Credentials plaintext |
| Parents / guardians | Yes | Firestore CRUD | `MISSING` | Portal isolation `MISSING` |
| Classes / subjects / years | Yes | Seed + list | `MISSING` | |
| Terms | Yes | Empty | `MISSING` | |
| Attendance | Yes | List only | `MISSING` | Save mock |
| Examinations / marks / results lifecycle | Yes | Partial list | `MISSING` | Approve/publish/lock mock |
| Fee-clearance results portal | Yes | Empty | `MISSING` | **Core requirement unmet** |
| Fees / invoices / payments | Yes | List only | `MISSING` | Totals trusted nowhere on server |
| Announcements / notifications | Yes | Empty | `MISSING` | |
| Audit logs | Yes | Empty | `MISSING` | |
| Users & roles admin | Yes | Visual only | `MISSING` | |
| Reports / library / inventory / transport | Yes | Empty/stub | `MISSING` | |
| Settings / profile | Yes | Profile update | `MISSING` | |
| File / photo storage | Yes | Firestore chunks | `MISSING` (should be Admin-gated) | Offline queue for files only |

---

## 8. Security findings (priority)

### CRITICAL

1. **Open Firestore rules** — `firestore.rules` allows unrestricted read/write on all documents.
2. **Client-trusted roles** — role field writable from browser; UI RBAC is cosmetic.
3. **Default `SCHOOL_ADMIN`** on profile create / missing role.
4. **Plaintext passwords** in `staffCredentials`.
5. **Profile update can change `role`** via client merge.
6. **No server authority** — financial amounts, fee clearance, result publish, and data isolation are not enforceable.

### HIGH

7. Anonymous Auth bootstrap for catalog.
8. Full school PII (students, guardians, invoices, file bytes) readable/writable from any client while rules are open.
9. Staff Auth password reset incomplete (Firestore credential ≠ Auth password).

### MEDIUM

10. Firebase web config hardcoded as fallbacks in `app.ts` (expected public keys, but coupled to prod project without App Check).
11. RTDB paths writable by any authenticated user.
12. Demo credentials in `mocks/data.ts` (risk if mirrored in production Auth).
13. Auth profile JSON in localStorage (secondary; Firestore is primary risk).

### What is NOT present (good)

- No DevTools / F12 fake security.
- No `firebase-admin` leaked into client bundle today (**because Admin is not implemented**).
- No Spring secrets in frontend.
- `.env` is gitignored; only `NEXT_PUBLIC_*` pattern documented.

---

## 9. Secrets & environment

### Present (public by design)

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_USE_MOCK_API`
- `NEXT_PUBLIC_SCHOOL_DATA_SOURCE`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- Optional: `NEXT_PUBLIC_FIREBASE_DATABASE_URL`, `NEXT_PUBLIC_FIRESTORE_DATABASE_ID`, `NEXT_PUBLIC_USE_FIRESTORE_DATA`

### Missing (required for target architecture)

- Firebase Admin service account / private key (server-only, **never** `NEXT_PUBLIC_*`)
- Any server session secrets / rate-limit store credentials

**REQUIRES CONFIGURATION:** Vercel/server env for Admin credentials once Admin SDK is introduced.

---

## 10. Firestore rules & indexes

| Artifact | Status |
|----------|--------|
| `firestore.rules` | **CRITICAL insecure** — open rules; comment still mentions Spring hybrid |
| `database.rules.json` | Auth-gated defaults; some paths over-permissive for any auth user |
| `firestore.indexes.json` | **MISSING** / not wired in `firebase.json` |
| Production rules deployment state | `NOT YET VERIFIED` — must confirm Console matches repo |

---

## 11. Offline / sync

| Scope | Status |
|-------|--------|
| File upload offline queue (IndexedDB + RTDB sync status) | `PARTIAL` — client-side; not authorization-safe against open rules |
| School entity offline CRUD | `MISSING` |
| Offline financial / results authority | Must **never** be treated as final without server confirmation |

Document required later: `OFFLINE-SYNC-ARCHITECTURE.md` (not created in this audit phase beyond this note).

---

## 12. Backups & DR

| Item | Status |
|------|--------|
| Automated Firestore backup / PITR documented & verified | `MISSING` |
| localStorage / IndexedDB as backup | **Invalid** as primary backup |
| `BACKUP-DISASTER-RECOVERY.md` | **Not yet written** (Phase 17) |

---

## 13. Testing & build

| Check | Status |
|-------|--------|
| Unit / integration / security tests | `MISSING` |
| Lint (`oxlint`) | Available; not treated as security suite |
| Production `next build` | Previously succeeded (`NOT YET VERIFIED` on this audit pass) |
| Browser bundle Admin/secret scan | Deferred to Phase 19 (Admin not present yet) |

---

## 14. Documentation inventory

| Document | Status |
|----------|--------|
| `BACKEND-AUDIT.md` | **This file — created** |
| `DATABASE-SCHEMA.md` | Next deliverable (schema from code) |
| `BROWSER-SECURITY-AUDIT.md` | Not yet |
| `BACKUP-DISASTER-RECOVERY.md` | Not yet |
| `SECURITY-ARCHITECTURE.md` | Not yet |
| `OFFLINE-SYNC-ARCHITECTURE.md` | Not yet |
| `README.md` | Describes Next + Firebase (accurate at high level) |

---

## 15. Recommended next phases (from master prompt — do not skip)

1. **Phase 3–4:** Document actual schema (`DATABASE-SCHEMA.md`); introduce `server-only` Admin module boundaries (no UI redesign).
2. **Phase 5–7:** Verify ID tokens server-side; centralized RBAC; **close Firestore rules** (default deny; server Admin for privileged writes).
3. **Phase 8–10:** Zod validation + `/api/v1` service/repository CRUD; point UI services at APIs without visual changes.
4. **Phase 11–14:** Finance integrity, results lifecycle, fee-clearance portal, audit logs.
5. **Phase 15–22:** Pagination/indexes, offline policy, backups, security tests, bundle audit, production validation.

### Immediate blockers before any “production ready” claim

- [ ] Close Firestore rules (no `if true`)
- [ ] Stop defaulting users to `SCHOOL_ADMIN`
- [ ] Remove plaintext `staffCredentials.password`
- [ ] Add Firebase Admin + `/api/v1` with verified Auth + RBAC
- [ ] Server-side fee clearance + results publish gates
- [ ] Automated unauthorized-access tests

---

## 16. Acceptance criteria snapshot (current)

Per master prompt §40 — **none of the security checkboxes can be honestly marked complete** while Firestore is world-writable and there is no server RBAC.

| Criterion example | Current |
|-------------------|---------|
| Authentication enforced (server) | Fail |
| RBAC server-enforced | Fail |
| Secure Firestore rules | Fail |
| Fee-clearance server-side | Fail |
| Admin SDK server-only | N/A (not implemented) |
| UI visually unchanged | Pass (audit made no UI changes) |
| Production build | Pass historically; re-verify after backend work |

---

## 17. Audit integrity statement

This document describes the **actual** repository state as of the audit date.

- Features labeled `MISSING` are **not implemented**.
- Client Firestore CRUD labeled `IMPLEMENTED` means **browser-side** only — **not** production-secure.
- No claim of “production ready” or “100% secure” is made.

**UI was not modified during this audit.**
