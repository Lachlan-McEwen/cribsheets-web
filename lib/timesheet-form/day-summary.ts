import type { TimeSheetDay } from '../timesheet-export/legacy-types.ts'
import { leaveTypeAbbreviation } from '../timesheet-export/legacy-format.ts'
import { normalizeTimeOfDayInput } from './time.ts'

/** Short hint on collapsed day row when the day already has times or leave (not shift — avoids single-letter codes like “F”). */
export function collapsedDaySummary(day: TimeSheetDay): string | null {
  const parts: string[] = []

  const start = day.start ? normalizeTimeOfDayInput(day.start) ?? day.start : null
  const end = day.end ? normalizeTimeOfDayInput(day.end) ?? day.end : null
  if (start && end) parts.push(`${start}–${end}`)
  else if (start) parts.push(start)

  const leave = leaveTypeAbbreviation(day.leaveType)
  if (leave) parts.push(leave)

  return parts.length ? parts.join(' · ') : null
}
