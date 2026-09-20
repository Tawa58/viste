# PERFORMANCE-AUDIT.md — VISTE MGT

**Date:** 2026-09-19  
**Scope:** Startup + page-load (local). UI/architecture unchanged.

## Verdict

| Mode | Main delay cause | Typical feel |
|------|------------------|--------------|
| `npm run dev` | **Next.js on-demand compile** of `/api/v1/*` (often 5–27s first hit) | Very slow first navigation |
| `npm run build` + `npm start` | Real work: Auth + API + Firestore | Much faster; still pays Firebase RTT |

**Development-mode compilation is the largest local delay.** Production removes most of it.

---

## Findings (measured / code-traced)

### 1. Initial page load & hydration — HIGH (dev) / MEDIUM (prod)

| Cause | Files | Impact | Fix |
|-------|-------|--------|-----|
| Extra client gate before App mounts | `src/client-app.tsx` | +1 paint frame | Keep (needed for Router); cheap |
| Full-page auth wait | `auth-context.tsx`, `App.tsx` `ProtectedRoute` | Blocks shell until `/auth/me` | Keep loader; cache me |
| **Eager import of every page** including dashboard/`recharts` | `src/App.tsx` | Large JS parse on first load | **Done: React.lazy routes** |

### 2. Firebase Auth init — MEDIUM

| Cause | Files | Impact | Fix |
|-------|-------|--------|-----|
| `onAuthStateChanged` → `/api/v1/auth/me` | `auth-context.tsx` | ~0.5–3s | Already cached; unavoidable once |
| Token verify + profile read | `session.ts` | ~100–500ms cached 20s | Already memoized |

### 3–6. Startup Firebase / bootstrap reads — HIGH

| Cause | Files | Impact | Fix |
|-------|-------|--------|-----|
| **`/api/v1/bootstrap` loaded almost all school collections at login** | `bootstrap/route.ts`, `prefetch.ts` | Many parallel Admin reads; competed with first paint | **Done: `scope=critical` then idle `scope=rest`** |
| Dashboard downloaded all students for headcount | `catalog-service.ts` | ~1–3s + large payload | **Done: `count()` for admin/staff; single payments read** |
| Students list up to **500** docs | `isolation.ts` | Heavy if large school | Cap kept (needed for students page) |
| Catalog 5 collections | `getCatalogSnapshot` | Moderate | Memo 30s already |

**No `onSnapshot` listeners** in the live API path (good). Legacy client Firestore still exists but is not used when server API is on.

### 7–8. Re-renders / useEffect chains — MEDIUM

| Cause | Files | Impact | Fix |
|-------|-------|--------|-----|
| Dashboard `Promise.all` of 7 service methods | `dashboard-page.tsx` | Coalesced to 1 HTTP via cache | Keep |
| Auth `prefetchSchoolData` after every `me()` | `auth-context.tsx` | Could stall login path | **Done: `requestIdleCallback`** |

### 9–10. Bundle weight — HIGH for first JS

| Cause | Files | Impact | Fix |
|-------|-------|--------|-----|
| All views statically imported | `App.tsx` | Charts/ops code up front | **Done: lazy routes** |
| `recharts` on dashboard | `dashboard-page.tsx` | Large | Split with dashboard chunk |
| Lucide named imports | many | Usually tree-shaken | OK |

### 11. Assets — LOW–MEDIUM

| Cause | Files | Impact | Fix |
|-------|-------|--------|-----|
| Google Fonts (Fraunces + Manrope) in layout | `layout.tsx` | Extra network on first load | Keep brand fonts |

### 12. Client components — LOW (by design)

SPA shell is intentionally client (`ClientApp` + React Router). Not changing architecture.

### 13. onSnapshot — NONE in API path

No repeated snapshot leaks found in current server-API mode.

### 14. Dev compile — CRITICAL locally

Logs showed compile times of **5–27s** per first API route under `next dev`. This dominates perceived slowness. Prefer `npm run build && npm start` for realistic timing.

---

## Fixes implemented

1. Lazy-load all route pages (`src/App.tsx`).
2. Slim warm-up: `/api/v1/bootstrap?scope=critical` then idle `scope=rest`.
3. Defer prefetch after auth with `requestIdleCallback`.
4. Dashboard uses Firestore `count()` for student/teacher headcounts (admin/staff).
5. Removed duplicate payments fetch on `/api/v1/dashboard`.
6. Announcements list limit 30 (was 100).

## Not done (needs product decision)

- Cursor pagination UI for students (500 cap remains).
- Always-on host (see `DEPLOY-ALWAYS-ON.md`).
