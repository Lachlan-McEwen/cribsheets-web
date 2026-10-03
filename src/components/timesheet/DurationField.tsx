import { useCallback, useState } from 'react'
import {
  filterDurationDraft,
  formatDurationFromParts,
  parseDurationHhMm,
} from '../../../lib/timesheet-form/duration-input.ts'

type Props = {
  label: string
  hours: number | null | undefined
  minutes: number | null | undefined
  onHoursChange: (value: number | null) => void
  onMinutesChange: (value: number | null) => void
  id?: string
  inputClassName?: string
}

/** Elapsed time as 24h-style HH:mm (e.g. 10:30 = 10h 30m), not clock time. */
export function DurationField({
  label,
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  id,
  inputClassName,
}: Props) {
  const inputId = id ?? `duration-${label.replace(/\W+/g, '-').toLowerCase()}`
  const [draft, setDraft] = useState<string | null>(null)
  const committed = formatDurationFromParts(hours, minutes)

  const commit = useCallback(
    (raw: string) => {
      const parts = parseDurationHhMm(raw)
      if (!parts) {
        onHoursChange(null)
        onMinutesChange(null)
        return
      }
      onHoursChange(parts.hours)
      onMinutesChange(parts.minutes)
    },
    [onHoursChange, onMinutesChange],
  )

  return (
    <div className="duration-field">
      <label className="duration-field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={`form-control duration-field__input ${inputClassName ?? ''}`.trim()}
        placeholder="HH:mm"
        value={draft !== null ? draft : committed}
        onFocus={() => setDraft(committed)}
        onBlur={(e) => {
          commit(filterDurationDraft(e.currentTarget.value))
          setDraft(null)
        }}
        onChange={(e) => setDraft(filterDurationDraft(e.currentTarget.value))}
      />
    </div>
  )
}
