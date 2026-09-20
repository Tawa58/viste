import type { ReactNode } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react'
import { VisteLoader } from '@/components/shared/loader'

type ToastMessages = {
  loading: string
  success: string
  error?: string
}

function iconWrap(icon: ReactNode, tone: 'success' | 'error' | 'info' | 'warning' | 'loading') {
  const tones = {
    success: 'bg-success/12 text-success',
    error: 'bg-destructive/12 text-destructive',
    info: 'bg-primary/10 text-primary',
    warning: 'bg-warning/12 text-warning',
    loading: 'bg-muted text-accent',
  } as const

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}
    >
      {icon}
    </span>
  )
}

export const notify = {
  success(message: string, description?: string) {
    return toast.success(message, {
      description,
      icon: iconWrap(<CheckCircle2 className="h-4 w-4" />, 'success'),
    })
  },

  error(message: string, description?: string) {
    return toast.error(message, {
      description,
      icon: iconWrap(<XCircle className="h-4 w-4" />, 'error'),
    })
  },

  info(message: string, description?: string) {
    return toast(message, {
      description,
      icon: iconWrap(<Info className="h-4 w-4" />, 'info'),
    })
  },

  warning(message: string, description?: string) {
    return toast.warning(message, {
      description,
      icon: iconWrap(<AlertTriangle className="h-4 w-4" />, 'warning'),
    })
  },

  loading(message: string, description?: string) {
    return toast.loading(message, {
      description,
      icon: iconWrap(<VisteLoader size="sm" label="Loading" />, 'loading'),
    })
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
