export function formatDateAu(d: Date): string {
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDayHeader(d: Date): string {
  const weekday = d.toLocaleDateString('en-AU', { weekday: 'short' })
  return `${weekday} ${formatDateAu(d)}`
}

export function parseIsoDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(iso)
}
