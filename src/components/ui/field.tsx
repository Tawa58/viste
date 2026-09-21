import {
  createContext,
  useContext,
  useId,
  type ReactNode,
  type ComponentProps,
} from 'react'
import { cn } from '@/lib/utils'

const FieldIdContext = createContext<string | undefined>(undefined)

/** Groups a label + control so they share one generated id. */
export function Field({ className, children, ...props }: ComponentProps<'div'>) {
  const id = useId()
  return (
    <FieldIdContext.Provider value={id}>
      <div className={cn('space-y-2', className)} {...props}>
        {children}
      </div>
    </FieldIdContext.Provider>
  )
}

export function useOptionalFieldId() {
  return useContext(FieldIdContext)
}

/** Prefer explicit id, then Field context, then a stable auto id. */
export function useFieldId(explicitId?: string) {
  const ctx = useContext(FieldIdContext)
  const autoId = useId()
  return explicitId || ctx || autoId
}

export function FieldIdProvider({
  id,
  children,
}: {
  id?: string
  children: ReactNode
}) {
  const autoId = useId()
  return (
    <FieldIdContext.Provider value={id || autoId}>{children}</FieldIdContext.Provider>
  )
}
