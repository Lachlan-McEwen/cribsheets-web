import { normalizeTimeOfDayInput } from './time.ts'

export function parseTimeHhMm(value: string | null | undefined): { hours: number; minutes: number } | null {
  const normalized = value ? normalizeTimeOfDayInput(value) : null
  if (!normalized) return null
  const [hours, minutes] = normalized.split(':').map(Number)
  return { hours, minutes }
}

/** Minutes from start to end on the same calendar day (end before start → assumes overnight). */
export function minutesBetweenClockTimes(start: string, end: string): number | null {
  const a = parseTimeHhMm(start)
  const b = parseTimeHhMm(end)
  if (!a || !b) return null
  let startM = a.hours * 60 + a.minutes
  let endM = b.hours * 60 + b.minutes
  if (endM <= startM) endM += 24 * 60
  return endM - startM
}

export function formatMinutesAsHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}
