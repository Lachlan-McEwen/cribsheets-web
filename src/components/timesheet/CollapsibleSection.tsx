import { useCallback, useState, type ReactNode } from 'react'

type DisclosureHeaderProps = {
  id: string
  className: string
  expanded: boolean
  onToggle: () => void
  headingLevel: 'h5' | 'h6'
  children: ReactNode
}

export function DisclosureHeader({
  id,
  className,
  expanded,
  onToggle,
  headingLevel,
  children,
}: DisclosureHeaderProps) {
  const Heading = headingLevel
  return (
    <Heading
      className={`disclosure-toggle ${className}`}
      aria-expanded={expanded}
      aria-controls={id}
      onClick={onToggle}
      role="button"
    >
      <span className="disclosure-toggle__label">{children}</span>
      <span className="disclosure-toggle__caret" aria-hidden="true" />
    </Heading>
  )
}

type Props = {
  id: string
  title: string
  toggleClass: string
  children: ReactNode
  onClear: () => void
}

export function CollapsibleSection({ id, title, toggleClass, children, onClear }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="section">
      <DisclosureHeader
        id={id}
        className={toggleClass}
        expanded={expanded}
        onToggle={() => setExpanded((open) => !open)}
        headingLevel="h6"
      >
        {title}
      </DisclosureHeader>
      <div id={id} className={`collapse crib${expanded ? ' show' : ''}`}>
        {children}
        <button type="button" className="section-clear-button" onClick={onClear}>
          🗑
        </button>
      </div>
    </div>
  )
}

export function useDigitsOnly() {
  return useCallback((raw: string) => raw.replace(/\D+/g, ''), [])
}

export function padTimePart(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  return String(value).padStart(2, '0')
}
