import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { getFirestoreDb } from '@/services/firebase/app'
import type { AuthUser, UserRole } from '@/types'

const DEFAULT_PREFS = { email: true, sms: false, inApp: true }

export async function getOrCreateUserProfile(firebaseUser: User): Promise<AuthUser> {
  const ref = doc(getFirestoreDb(), 'users', firebaseUser.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const data = snap.data() as Partial<AuthUser>
    return {
      id: firebaseUser.uid,
      name: data.name ?? firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
      email: (data.email ?? firebaseUser.email ?? '').toLowerCase(),
      role: (data.role as UserRole) ?? 'SCHOOL_ADMIN',
      avatarUrl: data.avatarUrl ?? firebaseUser.photoURL ?? undefined,
      phone: data.phone,
      title: data.title ?? 'School Administrator',
      department: data.department ?? 'Administration',
      employeeNumber: data.employeeNumber,
      staffId: data.staffId,
      studentId: data.studentId,
      guardianId: data.guardianId,
      bio: data.bio,
      preferredLanguage: data.preferredLanguage ?? 'en',
      timezone: data.timezone ?? 'Africa/Harare',
      notificationPrefs: {
        email: data.notificationPrefs?.email ?? true,
        sms: data.notificationPrefs?.sms ?? false,
        inApp: data.notificationPrefs?.inApp ?? true,
      },
    }
  }

  const created: AuthUser = {
    id: firebaseUser.uid,
    name: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'Administrator',
    email: (firebaseUser.email ?? '').toLowerCase(),
    role: 'SCHOOL_ADMIN',
    title: 'School Administrator',
    department: 'Administration',
    preferredLanguage: 'en',
    timezone: 'Africa/Harare',
    notificationPrefs: { ...DEFAULT_PREFS },
  }
  await setDoc(ref, created)
  return created
}

export async function updateUserProfile(
  userId: string,
  patch: Partial<AuthUser>,
): Promise<AuthUser> {
  const ref = doc(getFirestoreDb(), 'users', userId)
  const snap = await getDoc(ref)
  const current = snap.exists() ? (snap.data() as AuthUser) : null
  if (!current) throw new Error('User profile not found')
  const next: AuthUser = {
    ...current,
    ...patch,
    id: userId,
    notificationPrefs: {
      email: patch.notificationPrefs?.email ?? current.notificationPrefs?.email ?? true,
      sms: patch.notificationPrefs?.sms ?? current.notificationPrefs?.sms ?? false,
      inApp: patch.notificationPrefs?.inApp ?? current.notificationPrefs?.inApp ?? true,
    },
  }
  await updateDoc(ref, { ...next })
  return next
}
