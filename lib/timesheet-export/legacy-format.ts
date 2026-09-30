import type { LeaveType, ShiftCode } from './legacy-types.ts'

export const EMPLOYMENT_TYPE_TICK = 'ü'

export function timeSpanFromParts(
  hours: number | null | undefined,
  minutes: number | null | undefined,
): { hours: number; minutes: number } | null {
  if (hours == null && minutes == null) return null
  return { hours: hours ?? 0, minutes: minutes ?? 0 }
}

/** `Extensions.ToStringQWithTotalHours` */
export function formatQHours(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function shiftCodeAbbreviation(code: ShiftCode | undefined): string | null {
  switch (code ?? 'None') {
    case 'None':
      return null
    case 'Administration':
      return 'A'
    case 'Emergency':
      return 'E'
    case 'Communications':
      return 'C'
    case 'CommParamedic':
      return 'CP'
    case 'Function':
      return 'F'
    case 'Training':
      return 'T'
    case 'RMTS':
      return 'R'
    default:
      return null
  }
}

export function leaveTypeAbbreviation(type: LeaveType | undefined): string | null {
  switch (type ?? 'None') {
    case 'None':
      return null
    case 'AccruedDay':
      return 'ADO'
    case 'Annual':
      return 'ANN'
    case 'LongService':
      return 'LSL'
    case 'SickStandard':
      return 'SIC-sick01'
    case 'SickCOVID19':
      return 'SIC-sick02'
    case 'SickCOVID19D':
      return 'SIC-sick03'
    case 'Workcover':
      return 'WCA'
    case 'Retention':
      return 'RET'
    case 'UnpaidSicStandard':
      return 'SLUP-sick01'
    case 'UnpaidSicCOVID19':
      return 'SLUP-sick02'
    case 'UnpaidSicCOVID19D':
      return 'SLUP-sick03'
    case 'WithoutPay':
      return 'LWOP'
    case 'SpecialLeave':
      return 'SLWP'
    case 'SpecialLeaveOther':
      return 'SPEC'
    case 'PublicHoliday':
      return 'PHOL'
    case 'SpecialRestrictUrgPres':
      return 'SPEC23'
    case 'PaidPartner':
      return 'PPLA'
    default:
      return null
  }
}

export function splitEmployeeName(fullName: string | null | undefined): {
  surname: string
  firstName: string
} {
  if (!fullName?.trim()) return { surname: '', firstName: '' }
  const trimmed = fullName.trim()
  const lastSpace = trimmed.lastIndexOf(' ')
  if (lastSpace <= 0) return { surname: trimmed, firstName: '' }
  return {
    surname: trimmed.slice(lastSpace + 1).trim(),
    firstName: trimmed.slice(0, lastSpace).trim(),
  }
}

/** Parse legacy date/time JSON (ISO or `dd/MM/yyyy`, `HH:mm`). */
export function parseLegacyDate(value: string): Date {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [d, m, y] = value.split('/').map(Number)
    return new Date(y, m - 1, d)
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`)
  return d
}

export function formatDateDdMmYyyy(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function formatDateDdMmYy(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`
}

export function formatTimeHhMm(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatShiftChangeTime(d: Date): string {
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}
