import 'server-only'

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let app: App | undefined
let auth: Auth | undefined
let db: Firestore | undefined

function readServiceAccount():
  | { projectId: string; clientEmail: string; privateKey: string }
  | null {
  const json = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
  if (json?.trim()) {
    const parsed = JSON.parse(json) as {
      project_id?: string
      client_email?: string
      private_key?: string
    }
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is missing required fields')
    }
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, '\n'),
    }
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) return null
  return { projectId, clientEmail, privateKey }
}

export function isAdminConfigured(): boolean {
  try {
    return Boolean(readServiceAccount())
  } catch {
    return false
  }
}

export function getAdminApp(): App {
  if (app) return app
  const existing = getApps()[0]
  if (existing) {
    app = existing
    return app
  }

  const sa = readServiceAccount()
  if (!sa) {
    throw new Error(
      'Firebase Admin is not configured. Set FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON or FIREBASE_ADMIN_PROJECT_ID + FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY.',
    )
  }

  app = initializeApp({
    credential: cert({
      projectId: sa.projectId,
      clientEmail: sa.clientEmail,
      privateKey: sa.privateKey,
    }),
    projectId: sa.projectId,
  })
  return app
}

export function getAdminAuth(): Auth {
  if (!auth) auth = getAuth(getAdminApp())
  return auth
}

export function getAdminDb(): Firestore {
  if (!db) {
    db = getFirestore(getAdminApp())
    try {
      db.settings({ ignoreUndefinedProperties: true })
    } catch {
      // settings() can only be called once, before other Firestore use
    }
  }
  return db
}
