# Always-on deployment (no serverless cold starts)

Viste MGT runs as a **long-lived Node server** (Docker), not Vercel serverless functions.

## Why this

| Host | Cold starts? |
|------|----------------|
| Vercel serverless API | Yes (after idle) |
| Render **Starter+** / Railway always-on / Fly `min=1` | **No** |

Use **one** of the options below for the full app (UI + `/api/v1`).

---

## Option A — Render (recommended, simple)

1. Push this repo to GitHub.
2. Go to [https://dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the repo (uses `render.yaml`).
4. Choose **Starter** plan (or higher).  
   **Do not use Free** — Free spins down and brings cold starts back.
5. Set environment variables (same as `.env`):

   **Public**
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_USE_MOCK_API=false`
   - `NEXT_PUBLIC_SCHOOL_DATA_SOURCE=firestore`

   **Server-only (never public)**
   - `FIREBASE_ADMIN_PROJECT_ID`
   - `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `FIREBASE_ADMIN_PRIVATE_KEY` (paste full key; keep `\n` as real newlines or escaped `\n`)
   - `BOOTSTRAP_ADMIN_EMAILS=caxtonbuffalo@gmail.com`

6. Deploy. Health check: `https://YOUR-APP.onrender.com/api/v1/health`  
   Expect `"adminConfigured": true`.

---

## Option B — Railway

1. [https://railway.app](https://railway.app) → New Project → Deploy from GitHub.
2. Railway detects the `Dockerfile`.
3. Add the same env vars as above.
4. Generate a public domain.
5. Keep **1 replica** running (paid usage; don’t enable sleep).

---

## Option C — Local always-on test

```bash
npm run build
npm start
```

Or with Docker:

```bash
docker build -t viste-mgt .
docker run --rm -p 3000:3000 --env-file .env viste-mgt
```

---

## Vercel?

You can still use Vercel for previews, but for **production always-on**, prefer Render/Railway with this Docker setup so `/api/v1` never cold-starts.

---

## After deploy checklist

- [ ] `/api/v1/health` → `adminConfigured: true`
- [ ] Login with your Firebase admin email
- [ ] Students / Teachers pages load
- [ ] Firestore rules published (locked rules from `firestore.rules`)
