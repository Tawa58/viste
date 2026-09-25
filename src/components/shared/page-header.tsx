import type { ReactNode } from 'react'
import { Breadcrumbs } from './breadcrumbs'
import { FadeIn } from './page-transition'

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string
  description?: string
  breadcrumbs?: { label: string; to?: string }[]
  actions?: ReactNode
}) {
  return (
    <FadeIn>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-2">
          {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-1.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          // Phones: actions stretch into an even, tappable row.
          <div className="flex w-full flex-wrap items-center gap-2 *:grow sm:w-auto sm:*:grow-0">
            {actions}
          </div>
        )}
      </div>
    </FadeIn>
  )
}
