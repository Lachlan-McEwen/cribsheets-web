import { useCallback, type ReactNode } from 'react'

type Props = {
  id: string
  title: string
  toggleClass: string
  children: ReactNode
  onClear: () => void
}

export function CollapsibleSection({ id, title, toggleClass, children, onClear }: Props) {
  return (
    <div className="section">
      <h6
        aria-expanded="false"
        aria-controls={id}
        data-bs-toggle="collapse"
        data-bs-target={`#${id}`}
        className={toggleClass}
        role="button"
      >
        {title} ▼
      </h6>
      <div id={id} className="collapse crib">
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
