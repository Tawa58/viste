# Viste High School Management System (VISTE MGT)

Next.js + React UI (frozen) + **Next.js `/api/v1`** + Firebase Auth + Firestore (Admin SDK).

## Architecture

```
Browser (UI) → Firebase Auth ID token → /api/v1 → RBAC → Services → Firebase Admin → Firestore
```

Firestore Security Rules default-deny school collections. Do not use the browser as a trusted database client for school data.

## Run locally

```bash
npm install
npm run dev
```

### Required server env

Copy `.env.example` → `.env` and set:

- `NEXT_PUBLIC_FIREBASE_*` (web)
- `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`
  - or `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`
- `BOOTSTRAP_ADMIN_EMAILS` (comma-separated) for first SUPER_ADMIN users

Deploy rules:

```bash
firebase deploy --only firestore:rules,database
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev |
| `npm run build` | Production build |
| `npm run test` | Vitest (RBAC/validators) |
| `npm run lint` | oxlint |

## Docs

- `DEPLOY-ALWAYS-ON.md` — Render / Railway always-on (no cold starts)
- `BACKEND-AUDIT.md`
- `DATABASE-SCHEMA.md`
- `SECURITY-ARCHITECTURE.md`
- `BROWSER-SECURITY-AUDIT.md`
- `BACKUP-DISASTER-RECOVERY.md`
- `OFFLINE-SYNC-ARCHITECTURE.md`

## Deploy (always-on — no serverless cold starts)

See **[DEPLOY-ALWAYS-ON.md](./DEPLOY-ALWAYS-ON.md)**.

Recommended: **Render Starter** or **Railway** with the included `Dockerfile`.  
Do **not** use Render Free (it sleeps). Vercel serverless will cold-start after idle.

```bash
npm run build
npm start
```
