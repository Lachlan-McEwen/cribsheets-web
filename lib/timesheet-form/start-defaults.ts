import type { TimeSheetDay } from '../timesheet-export/legacy-types.ts'
import { addDecimalHoursToTime, defaultShiftDurationParts } from './time.ts'

/** MVC `startChanged(i)` — fill rostered duration and end from profile default shift hours. */
export function applyStartWithDefaultShiftHours(
  day: TimeSheetDay,
  defaultShiftHours: number | null | undefined,
): Partial<TimeSheetDay> {
  if (!day.start?.trim() || defaultShiftHours == null || defaultShiftHours <= 0) {
    return {}
  }

  const patch: Partial<TimeSheetDay> = {}
  const rosteredEmpty = day.rosteredHours == null || day.rosteredHours === 0

  if (rosteredEmpty && (day.rosteredMinutes == null || day.rosteredMinutes === 0)) {
    const parts = defaultShiftDurationParts(defaultShiftHours)
    patch.rosteredHours = parts.hours
    patch.rosteredMinutes = parts.minutes
  }

  const end = addDecimalHoursToTime(day.start, defaultShiftHours)
  if (end) patch.end = end

  return patch
}
