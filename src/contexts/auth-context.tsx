'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { authService } from '@/services/api'
import { USE_MOCK_API } from '@/services/api/client'
import { getFirebaseAuth } from '@/services/firebase/app'
import { clearSchoolDataCache, prefetchSchoolData } from '@/services/api/prefetch'
import { clearAuthTokenCache } from '@/services/api/http-client'
import { mockUsers } from '@/mocks/data'
import type { AuthUser } from '@/types'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (patch: Partial<AuthUser>) => Promise<AuthUser>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const STORAGE_KEY = 'viste.auth.user'

function persistUser(user: AuthUser, remember = true) {
  const payload = JSON.stringify(user)
  sessionStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(STORAGE_KEY)
  ;(remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, payload)
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (USE_MOCK_API) {
      const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        try {
          const stored = JSON.parse(raw) as AuthUser
          const canonical = mockUsers.find((u) => u.id === stored.id || u.email === stored.email)
          setUser(canonical ? { ...canonical, ...stored, role: canonical.role, id: canonical.id } : stored)
        } catch {
          clearSession()
        }
      }
      setLoading(false)
      return
    }

    const unsub = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
      try {
        if (!firebaseUser || firebaseUser.isAnonymous) {
          setUser(null)
          clearSession()
          clearSchoolDataCache()
          clearAuthTokenCache()
          return
        }
        if (!authService.me) {
          setUser(null)
          clearSession()
          return
        }
        const profile = await authService.me()
        setUser(profile)
        persistUser(profile, true)
        // Defer warm-up so first paint / dashboard aren’t competing with a full school dump
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          window.requestIdleCallback(() => prefetchSchoolData(), { timeout: 2500 })
        } else {
          setTimeout(() => prefetchSchoolData(), 300)
        }
      } catch (err) {
        console.error(err)
        setUser(null)
        clearSession()
      } finally {
        setLoading(false)
      }
    })

    return () => unsub()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password, remember = true) {
        const next = await authService.login(email, password, remember)
        setUser(next)
        persistUser(next, remember)
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          window.requestIdleCallback(() => prefetchSchoolData(), { timeout: 2500 })
        } else {
          setTimeout(() => prefetchSchoolData(), 300)
        }
      },
      async logout() {
        await authService.logout()
        clearSession()
        clearSchoolDataCache()
        clearAuthTokenCache()
        setUser(null)
      },
      async updateProfile(patch) {
        if (!user) throw new Error('Not signed in')
        const next = await authService.updateProfile(user.id, patch)
        setUser(next)
        persistUser(next, Boolean(localStorage.getItem(STORAGE_KEY)))
        return next
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
