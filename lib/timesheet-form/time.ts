export function digitsOnly(raw: string): string {
  return raw.replace(/\D+/g, '')
}

export function clampHour(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(23, Math.max(0, Math.trunc(n)))
}

export function clampMinute(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(59, Math.max(0, Math.trunc(n)))
}

export function formatTimeHhMm(hours: number, minutes: number): string {
  return `${String(clampHour(hours)).padStart(2, '0')}:${String(clampMinute(minutes)).padStart(2, '0')}`
}

/** Parse typed digits or `H:mm` / `HH:mm` into normalized `HH:mm`, or null if empty. */
export function normalizeTimeOfDayInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const colonMatch = /^(\d{1,2}):(\d{1,2})$/.exec(trimmed)
  if (colonMatch) {
    return formatTimeHhMm(Number(colonMatch[1]), Number(colonMatch[2]))
  }

  const digits = digitsOnly(trimmed)
  if (!digits) return null

  if (digits.length <= 2) {
    return formatTimeHhMm(Number(digits), 0)
  }

  if (digits.length === 3) {
    return formatTimeHhMm(Number(digits.slice(0, 1)), Number(digits.slice(1, 3)))
  }

  const hours = clampHour(Number(digits.slice(0, 2)))
  const minuteDigits = digits.slice(2, 4).padEnd(2, '0')
  return formatTimeHhMm(hours, Number(minuteDigits))
}

/** Legacy `Date` + fractional hours (same as MVC `startChanged`). */
export function addDecimalHoursToTime(start: string, decimalHours: number): string | null {
  const normalized = normalizeTimeOfDayInput(start)
  if (!normalized || !decimalHours) return null
  const [h, m] = normalized.split(':').map(Number)
  const date = new Date(2000, 0, 1, h, m, 0)
  date.setTime(date.getTime() + decimalHours * 60 * 60 * 1000)
  return formatTimeHhMm(date.getHours(), date.getMinutes())
}

export function defaultShiftDurationParts(decimalHours: number): { hours: number; minutes: number } {
  const hours = Math.floor(decimalHours)
  const minutes = Math.round((decimalHours % 1) * 60)
  return { hours: clampHour(hours), minutes: clampMinute(minutes) }
}

export function decimalHoursFromDurationParts(
  hours: number | null | undefined,
  minutes: number | null | undefined,
): number | null {
  if (hours == null && minutes == null) return null
  const h = hours ?? 0
  const m = minutes ?? 0
  if (h === 0 && m === 0) return null
  return h + m / 60
}

export function normalizeHourInput(raw: string): number | null {
  const digits = digitsOnly(raw)
  if (!digits) return null
  const n = Number(digits.length > 2 ? digits.slice(0, 2) : digits)
  return clampHour(n)
}

export function normalizeMinuteInput(raw: string): number | null {
  const digits = digitsOnly(raw)
  if (!digits) return null
  const n = Number(digits.length > 2 ? digits.slice(-2) : digits.padStart(2, '0'))
  return clampMinute(n)
}

export function formatDurationPart(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return ''
  return String(value).padStart(2, '0')
}
