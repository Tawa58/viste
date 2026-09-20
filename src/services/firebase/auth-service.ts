import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
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
    return getOrCreateUserProfile(cred.user)
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
