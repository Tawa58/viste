import { toast } from 'sonner'
import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { VisteLoader } from '@/components/shared/loader'

type ToastMessages = {
  loading: string
  success: string
  error?: string
}

type ToastTone = 'success' | 'error' | 'info' | 'warning' | 'loading'

/** Large round status icon — same look as the login feedback card. */
export function toastIcon(tone: ToastTone) {
  if (tone === 'loading') {
    return (
      <span className="relative flex h-14 w-14 items-center justify-center">
        <span className="auth-loader-halo absolute inset-0 rounded-full bg-accent/20" />
        <VisteLoader size="xl" label="Loading" className="relative text-accent" />
      </span>
    )
  }

  const tones = {
    success: 'bg-success/15 text-success ring-success/30',
    error: 'bg-destructive/12 text-destructive ring-destructive/30',
    info: 'bg-primary/10 text-primary ring-primary/25',
    warning: 'bg-warning/12 text-warning ring-warning/30',
  } as const
  const Icon = { success: Check, error: X, info: Info, warning: AlertTriangle }[tone]

  return (
    <span
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-1 ${tones[tone]}`}
    >
      <Icon
        className="auth-mark h-8 w-8 stroke-[2.5]"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </span>
  )
}

export const notify = {
  success(message: string, description?: string) {
    return toast.success(message, { description, icon: toastIcon('success') })
  },

  error(message: string, description?: string) {
    return toast.error(message, { description, icon: toastIcon('error') })
  },

  info(message: string, description?: string) {
    return toast.info(message, { description, icon: toastIcon('info') })
  },

  warning(message: string, description?: string) {
    return toast.warning(message, { description, icon: toastIcon('warning') })
  },

  loading(message: string, description?: string) {
    return toast.loading(message, { description, icon: toastIcon('loading') })
  },

  dismiss(id?: string | number) {
    toast.dismiss(id)
  },

  /** Shows loading → success/error for any async process. */
  async process<T>(
    work: Promise<T> | (() => Promise<T>),
    messages: ToastMessages,
  ): Promise<T> {
    const promise = typeof work === 'function' ? work() : work
    toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: (err) =>
        messages.error ??
        (err instanceof Error ? err.message : 'Something went wrong. Please try again.'),
    })
    return promise
  },
}

/** Short simulated delay for mock actions so loading feedback is visible. */
export function mockDelay(ms = 700) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function runMockProcess(
  messages: ToastMessages,
  delayMs = 700,
): Promise<void> {
  await notify.process(mockDelay(delayMs), messages)
}
