const CASUAL_ANCHOR = new Date(2020, 11, 20)
const PERMANENT_ANCHOR = new Date(2020, 11, 27)

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function getFortnightEndingDates(casual: boolean): Date[] {
  let date = startOfDay(casual ? CASUAL_ANCHOR : PERMANENT_ANCHOR)
  const dates: Date[] = []
  const limit = startOfDay(new Date())
  limit.setDate(limit.getDate() + 14)

  while (date < limit) {
    dates.push(new Date(date))
    date.setDate(date.getDate() + 14)
  }

  dates.reverse()
  return dates
}

export function getCurrentFortnightEnding(casual: boolean): Date {
  const today = startOfDay(new Date())
  return getFortnightEndingDates(casual).find((d) => d >= today) ?? getFortnightEndingDates(casual)[0]!
}

export function isFortnightEndingForType(date: Date, casual: boolean): boolean {
  const anchor = startOfDay(casual ? CASUAL_ANCHOR : PERMANENT_ANCHOR)
  const d = startOfDay(date)
  const diffDays = Math.round((d.getTime() - anchor.getTime()) / (24 * 60 * 60 * 1000))
  return diffDays % 14 === 0
}

export function getAllFortnightDates(): Date[] {
  const set = new Set<number>()
  for (const d of getFortnightEndingDates(false)) set.add(d.getTime())
  for (const d of getFortnightEndingDates(true)) set.add(d.getTime())
  return [...set].sort((a, b) => b - a).map((t) => new Date(t))
}

export function toFortnightParam(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

export function parseFortnightParam(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function isReasonableFortnightEnding(date: Date): boolean {
  const min = getFortnightEndingDates(false).at(-1)!
  const max = new Date()
  max.setFullYear(max.getFullYear() + 1)
  const d = startOfDay(date)
  return (
    d >= startOfDay(min) &&
    d <= startOfDay(max) &&
    (isFortnightEndingForType(d, false) || isFortnightEndingForType(d, true))
  )
}
