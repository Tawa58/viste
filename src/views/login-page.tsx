import { useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { BrandMark } from '@/components/shared/brand-mark'
import {
  LoginAuthFeedback,
  type LoginAuthStatus,
} from '@/components/shared/login-auth-feedback'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { FadeIn } from '@/components/shared/page-transition'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { authService } from '@/services/api'
import { USE_MOCK_API } from '@/services/api/client'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),
})

type LoginValues = z.infer<typeof loginSchema>

const MIN_LOADING_MS = 900
const SUCCESS_HOLD_MS = 1400
const ERROR_HOLD_MS = 1800

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [authStatus, setAuthStatus] = useState<LoginAuthStatus>('idle')

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: true,
    },
  })

  const busy = authStatus !== 'idle'

  // Allow success animation to finish before auto-redirect from auth context
  if (user && authStatus === 'idle') return <Navigate to="/dashboard" replace />

  async function onSubmit(values: LoginValues) {
    const startedAt = Date.now()
    // Force a paint before the auth call so the loader is never skipped
    flushSync(() => {
      setAuthStatus('loading')
    })

    try {
      await login(values.email.trim(), values.password, values.remember)
      const remaining = MIN_LOADING_MS - (Date.now() - startedAt)
      if (remaining > 0) await wait(remaining)
      flushSync(() => {
        setAuthStatus('success')
      })
      await wait(SUCCESS_HOLD_MS)
      navigate('/dashboard', { replace: true })
    } catch {
      const remaining = MIN_LOADING_MS - (Date.now() - startedAt)
      if (remaining > 0) await wait(remaining)
      flushSync(() => {
        setAuthStatus('error')
      })
      await wait(ERROR_HOLD_MS)
      setAuthStatus('idle')
    }
  }

  function handleSubmit(e: FormEvent) {
    void form.handleSubmit(onSubmit)(e)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2748%27 height=%2748%27 viewBox=%270 0 48 48%27%3E%3Cpath fill=%27%230b3d5c%27 fill-opacity=%270.035%27 d=%27M0 0h1v48H0zm47 0h1v48h-1zM0 0h48v1H0zm0 47h48v1H0z%27/%3E%3C/svg%3E')]" />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
        <FadeIn className="hidden lg:block">
          <BrandMark />
          <h1 className="mt-8 max-w-xl font-display text-4xl font-semibold tracking-tight text-foreground xl:text-5xl">
            School operations, designed with clarity.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            A premium console for academics, attendance, fees, and communications — built for
            Viste High School.
          </p>
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-card">
            <div className="rounded-xl bg-accent/10 p-2.5 text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {USE_MOCK_API ? 'Mock authentication' : 'Firebase Authentication'}
              </p>
              <p className="text-xs text-muted-foreground">
                {USE_MOCK_API
                  ? 'Using local mock users for UI development.'
                  : 'Sign in with your Firebase Auth email and password. School data is stored in Firestore.'}
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.08}>
          <Card
            className={cn(
              'relative mx-auto w-full max-w-md border-border/70 shadow-elevated hover:shadow-elevated',
              busy && 'pointer-events-none',
            )}
          >
            <CardHeader className="space-y-3">
              <div className="lg:hidden">
                <BrandMark />
              </div>
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>Access the Viste High School management console.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email / username</Label>
                  <Input
                    id="email"
                    autoComplete="username"
                    disabled={busy}
                    {...form.register('email')}
                    placeholder="you@viste.school"
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="pr-11"
                      disabled={busy}
                      {...form.register('password')}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      disabled={busy}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.watch('remember')}
                      onCheckedChange={(v) => form.setValue('remember', v === true)}
                      disabled={busy}
                    />
                    Remember me
                  </label>
                  <button type="button" className="text-sm font-medium text-primary hover:underline">
                    Forgot password
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  loading={authStatus === 'loading'}
                  disabled={busy}
                >
                  Sign in
                </Button>
              </form>

              {USE_MOCK_API ? (
                <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/40 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-warning">
                    Development credentials only
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {authService.getDemoCredentials().map((cred) => (
                      <li
                        key={cred.email}
                        className="rounded-xl border border-border/60 bg-card px-3 py-2.5 transition-colors hover:border-primary/20"
                      >
                        <span className="block font-semibold">{cred.label}</span>
                        <span className="text-muted-foreground">
                          {cred.email} · {cred.password}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {authStatus !== 'idle' ? <LoginAuthFeedback status={authStatus} /> : null}
    </div>
  )
}
