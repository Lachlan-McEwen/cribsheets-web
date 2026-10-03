import { clampMinute, digitsOnly } from './time.ts'

const MAX_DURATION_HOURS = 23

/** Allow only digits and a single colon while typing HH:mm duration. */
export function filterDurationDraft(raw: string): string {
  let out = ''
  let seenColon = false
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      out += ch
    } else if (ch === ':' && !seenColon) {
      out += ch
      seenColon = true
    }
  }
  return out
}

function clampDurationHours(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(MAX_DURATION_HOURS, Math.max(0, Math.trunc(n)))
}

export function formatDurationHhMm(hours: number, minutes: number): string {
  return `${String(clampDurationHours(hours)).padStart(2, '0')}:${String(clampMinute(minutes)).padStart(2, '0')}`
}

export function formatDurationFromParts(
  hours: number | null | undefined,
  minutes: number | null | undefined,
): string {
  if (hours == null && minutes == null) return ''
  const h = hours ?? 0
  const m = minutes ?? 0
  if (h === 0 && m === 0) return ''
  return formatDurationHhMm(h, m)
}

/** Parse duration as 24h-style H:MM (length, not time of day). Max 23:59. */
export function parseDurationHhMm(raw: string): { hours: number; minutes: number } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const colonMatch = /^(\d{1,2}):(\d{1,2})$/.exec(trimmed)
  if (colonMatch) {
    const hours = clampDurationHours(Number(colonMatch[1]))
    const minutes = clampMinute(Number(colonMatch[2]))
    if (hours === 0 && minutes === 0) return null
    return { hours, minutes }
  }

  const digits = digitsOnly(trimmed)
  if (!digits) return null

  let hours: number
  let minutes: number
  if (digits.length <= 2) {
    hours = clampDurationHours(Number(digits))
    minutes = 0
  } else if (digits.length === 3) {
    hours = clampDurationHours(Number(digits.slice(0, 1)))
    minutes = clampMinute(Number(digits.slice(1, 3)))
  } else {
    hours = clampDurationHours(Number(digits.slice(0, 2)))
    minutes = clampMinute(Number(digits.slice(2, 4).padEnd(2, '0')))
  }

  if (hours === 0 && minutes === 0) return null
  return { hours, minutes }
}
