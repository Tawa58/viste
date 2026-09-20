# BROWSER-SECURITY-AUDIT.md — VISTE MGT

**Status:** `PARTIAL` / `NOT YET VERIFIED` against a production deploy with Admin enabled  
**Date:** 2026-09-19

## Design intent

Sensitive logic lives under `src/server/**` and `src/lib/firebase/admin.ts` with `import 'server-only'`.  
These modules must not appear in the client bundle.

## Expected browser exposure (acceptable)

- Firebase **web** API key / project config (`NEXT_PUBLIC_FIREBASE_*`)
- React UI, route maps, presentation-only role helpers
- Calls to `/api/v1` with user ID tokens
- Public error messages (no stacks in production)

## Must NOT appear in browser bundles

Search production `.next/static` after `npm run build` for:

- `firebase-admin`
- `private_key` / `privateKey`
- `BEGIN PRIVATE KEY`
- `client_email`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `credential.cert`

## Procedure (run after Admin env is set)

```bash
npm run build
```

Then search client chunks for Admin/secret markers (do this locally; do not paste secrets into chat).

**Build status (2026-09-19):** `next build` succeeded with `/api/v1/*` routes present. Client SPA chunk remains separate from API route modules.  
**Live Vercel bundle inspection:** `NOT YET VERIFIED`

## Source maps

Do not upload server source maps publicly. Prefer Vercel’s private sourcemap handling.

## Network

Attackers can see API JSON. DTOs omit plaintext passwords. Staff credentials endpoints return metadata without `password`.
