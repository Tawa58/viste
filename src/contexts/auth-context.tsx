import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService } from '@/services/api'
import { USE_MOCK_API } from '@/services/api/client'
import { clearAccessToken } from '@/services/api/http'
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

function persistUser(user: AuthUser) {
  const payload = JSON.stringify(user)
  if (localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, payload)
    return
  }
  if (sessionStorage.getItem(STORAGE_KEY)) {
    sessionStorage.setItem(STORAGE_KEY, payload)
    return
  }
  localStorage.setItem(STORAGE_KEY, payload)
}

function hydrateStoredUser(raw: string): AuthUser | null {
  try {
    const stored = JSON.parse(raw) as AuthUser
    if (!USE_MOCK_API) return stored
    const canonical = mockUsers.find((u) => u.id === stored.id || u.email === stored.email)
    if (!canonical) return stored
    return {
      ...canonical,
      ...stored,
      role: canonical.role,
      id: canonical.id,
      notificationPrefs: {
        email: stored.notificationPrefs?.email ?? canonical.notificationPrefs?.email ?? true,
        sms: stored.notificationPrefs?.sms ?? canonical.notificationPrefs?.sms ?? false,
        inApp: stored.notificationPrefs?.inApp ?? canonical.notificationPrefs?.inApp ?? true,
      },
    }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const hydrated = hydrateStoredUser(raw)
      if (hydrated) {
        setUser(hydrated)
        persistUser(hydrated)
      } else {
        localStorage.removeItem(STORAGE_KEY)
        sessionStorage.removeItem(STORAGE_KEY)
        clearAccessToken()
      }
    }
    setLoading(false)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password, remember = true) {
        const next = await authService.login(email, password, remember)
        setUser(next)
        const payload = JSON.stringify(next)
        sessionStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(STORAGE_KEY)
        ;(remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, payload)
      },
      async logout() {
        await authService.logout()
        clearAccessToken()
        setUser(null)
        localStorage.removeItem(STORAGE_KEY)
        sessionStorage.removeItem(STORAGE_KEY)
      },
      async updateProfile(patch) {
        if (!user) throw new Error('Not signed in')
        const next = await authService.updateProfile(user.id, patch)
        setUser(next)
        persistUser(next)
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
