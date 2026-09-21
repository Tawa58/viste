import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth'
import { initializeApp, deleteApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { demoCredentials } from '@/mocks/data'
import type { AuthUser } from '@/types'
import type { AuthService } from '@/services/api/contracts'
import { getFirebaseApp, getFirebaseAuth } from '@/services/firebase/app'
import {
  getOrCreateUserProfile,
  updateUserProfile,
} from '@/services/firestore/user-profile'

/**
 * Firebase Auth only — no Spring/Java.
 * Creates / loads Firestore `users/{uid}` for role + profile.
 */
export class FirebaseAuthService implements AuthService {
  async login(email: string, password: string, _remember = true): Promise<AuthUser> {
    const cred = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      email.trim().toLowerCase(),
      password,
    )
    try {
      const { apiFetch } = await import('@/services/api/http-client')
      const me = await apiFetch<{ user: AuthUser }>('/api/v1/auth/me')
      return me.user
    } catch (err) {
      await signOut(getFirebaseAuth()).catch(() => undefined)
      const { ApiClientError } = await import('@/services/api/http-client')
      if (err instanceof ApiClientError) throw err
      // API unreachable (dev) — fall back to client profile only.
      return getOrCreateUserProfile(cred.user)
    }
  }

  async logout(): Promise<void> {
    await signOut(getFirebaseAuth())
  }

  getDemoCredentials() {
    return demoCredentials
  }

  async me(): Promise<AuthUser> {
    const user = getFirebaseAuth().currentUser
    if (!user) throw new Error('Not signed in')
    return getOrCreateUserProfile(user)
  }

  async session(): Promise<{ user: AuthUser; permissions: string[] }> {
    const user = await this.me()
    return { user, permissions: [] }
  }

  async updateProfile(userId: string, patch: Partial<AuthUser>): Promise<AuthUser> {
    const auth = getFirebaseAuth()
    if (auth.currentUser && patch.name) {
      await updateProfile(auth.currentUser, { displayName: patch.name })
    }
    return updateUserProfile(userId, patch)
  }

  /** Reauthenticate, set a new Firebase password, then clear admin temp-password tag. */
  async changePassword(currentPassword: string, nextPassword: string): Promise<void> {
    const auth = getFirebaseAuth()
    const user = auth.currentUser
    if (!user?.email) throw new Error('Not signed in')
    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, credential)
    await updatePassword(user, nextPassword)
    try {
      const { apiCatalogService } = await import('@/services/api/server-api-services')
      await apiCatalogService.acknowledgePasswordChanged()
    } catch (err) {
      console.error('Could not clear temporary password flag', err)
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase()
    if (!normalized) throw new Error('Email is required')
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), normalized)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code !== 'auth/user-not-found' && code !== 'auth/invalid-email') {
        throw err instanceof Error ? err : new Error('Could not send reset email')
      }
    }
    try {
      await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
      })
    } catch {
      /* best-effort */
    }
  }
}

/**
 * Creates a Firebase Auth user without replacing the admin session
 * (used when registering teachers).
 */
export async function createFirebaseAuthUser(input: {
  email: string
  password: string
  displayName: string
}): Promise<User> {
  const primary = getFirebaseApp()
  const secondaryName = `secondary-${Date.now()}`
  const secondary = initializeApp(primary.options, secondaryName)
  try {
    const secondaryAuth = getAuth(secondary)
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      input.email.trim().toLowerCase(),
      input.password,
    )
    await updateProfile(cred.user, { displayName: input.displayName })
    await signOut(secondaryAuth)
    return cred.user
  } finally {
    const app = getApps().find((a) => a.name === secondaryName)
    if (app) await deleteApp(app)
  }
}
