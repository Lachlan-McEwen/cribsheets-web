import { useState } from 'react'
import type { TimeSheetDay } from '../../../lib/timesheet-export/legacy-types.ts'
import { applyStartWithDefaultShiftHours } from '../../../lib/timesheet-form/start-defaults.ts'
import { defaultShiftDurationParts } from '../../../lib/timesheet-form/time.ts'
import { ClockTimeField } from './ClockTimeField.tsx'
import { DurationField } from './DurationField.tsx'

type Props = {
  index: number
  day: TimeSheetDay
  defaultShiftHours: number | null
  onChange: (patch: Partial<TimeSheetDay>) => void
}

export function ShiftTimesBlock({ index, day, defaultShiftHours, onChange }: Props) {
  const [hint, setHint] = useState<string | null>(null)

  const applyFromProfile = () => {
    if (!day.start?.trim()) {
      setHint('Set a start time first.')
      return
    }
    if (defaultShiftHours == null || defaultShiftHours <= 0) {
      setHint('Add default shift hours on your profile.')
      return
    }
    const patch = applyStartWithDefaultShiftHours(day, defaultShiftHours)
    onChange(patch)
    const parts = defaultShiftDurationParts(defaultShiftHours)
    setHint(
      `Applied ${parts.hours} h${parts.minutes ? ` ${parts.minutes} min` : ''} rostered and end time from your default shift.`,
    )
  }

  const profileLabel =
    defaultShiftHours != null && defaultShiftHours > 0
      ? `Apply default shift (${defaultShiftHours} h)`
      : null

  return (
    <section className="shift-times-block" aria-labelledby={`shift-times-heading-${index}`}>
      <h6 className="shift-times-block__heading" id={`shift-times-heading-${index}`}>
        Shift times
      </h6>

      <div className="shift-times-block__clocks">
        <ClockTimeField
          id={`rosteredStart${index}`}
          label="Start"
          value={day.start}
          onChange={(start) => {
            setHint(null)
            onChange({ start })
          }}
        />
        <ClockTimeField
          id={`rosteredEnd${index}`}
          label="End"
          value={day.end}
          onChange={(end) => {
            setHint(null)
            onChange({ end })
          }}
        />
      </div>

      {profileLabel ? (
        <button type="button" className="btn btn-sm btn-outline-secondary shift-times-block__apply" onClick={applyFromProfile}>
          {profileLabel}
        </button>
      ) : null}
      {hint ? <p className="shift-times-block__hint text-muted">{hint}</p> : null}

      <h6 className="shift-times-block__subheading">Hours claimed</h6>
      <div className="shift-times-block__durations">
        <DurationField
          id={`rosteredDuration${index}`}
          label="Rostered"
          hours={day.rosteredHours}
          minutes={day.rosteredMinutes}
          onHoursChange={(rosteredHours) => onChange({ rosteredHours })}
          onMinutesChange={(rosteredMinutes) => onChange({ rosteredMinutes })}
          inputClassName={`hours hours${index}`}
        />
        <DurationField
          label="Overtime"
          hours={day.overtimeHours}
          minutes={day.overtimeMinutes}
          onHoursChange={(overtimeHours) => onChange({ overtimeHours })}
          onMinutesChange={(overtimeMinutes) => onChange({ overtimeMinutes })}
        />
        <DurationField
          label="Meals (unpaid)"
          hours={day.mealsHours}
          minutes={day.mealsMinutes}
          onHoursChange={(mealsHours) => onChange({ mealsHours })}
          onMinutesChange={(mealsMinutes) => onChange({ mealsMinutes })}
        />
      </div>
    </section>
  )
}
