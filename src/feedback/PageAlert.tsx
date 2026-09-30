import type { ReactNode } from 'react'

type Variant = 'danger' | 'success' | 'warning' | 'info'

type Props = {
  variant: Variant
  children: ReactNode
  className?: string
}

/** Persistent in-page message (e.g. failed to load page data). */
export function PageAlert({ variant, children, className = '' }: Props) {
  return (
    <div className={`cs-page-alert cs-page-alert--${variant} ${className}`.trim()} role="alert">
      {children}
    </div>
  )
}
