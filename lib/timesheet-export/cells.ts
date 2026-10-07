export const FORTNIGHT_DAY_COUNT = 14

export const FIRST_DAY_ROW = 20

export const DAY_ROW_COLS = ['B', 'C', 'D', 'E', 'F', 'H', 'M', 'N', 'P', 'Q', 'S', 'W'] as const
export type DayRowCol = (typeof DAY_ROW_COLS)[number]

export const CRIB_COLUMNS = ['O', 'Q', 'S', 'T', 'U', 'V', 'X', 'Z', 'AB', 'AC', 'AE', 'AG', 'AI', 'AJ'] as const

export const FIRST_CRIB_ROW = 38
export const SECOND_CRIB_ROW = 46

/** Header / identity cells on the permanent staff data sheet (legacy WriteSpreadSheet). */
export const HEADER_CELLS = {
  fortnightEnding: 'AA8',
  surname: 'F5',
  firstName: 'S5',
  employeeNumber: 'AA5',
  unitStation: 'D8',
  countryEmployment: 'M8',
  metroEmployment: 'M9',
  templateVersion: 'AD1',
  excessOnCallHours: 'BB35',
} as const

export function dayRow(dayIndex: number): number {
  return dayIndex + FIRST_DAY_ROW
}

export function dayCell(dayIndex: number, col: DayRowCol): string {
  return `${col}${dayRow(dayIndex)}`
}

export function cribColumn(dayIndex: number): (typeof CRIB_COLUMNS)[number] {
  return CRIB_COLUMNS[dayIndex]
}

export function headerCellRefs(): string[] {
  return [
    HEADER_CELLS.fortnightEnding,
    HEADER_CELLS.surname,
    HEADER_CELLS.firstName,
    HEADER_CELLS.employeeNumber,
    HEADER_CELLS.unitStation,
    HEADER_CELLS.countryEmployment,
    HEADER_CELLS.metroEmployment,
    HEADER_CELLS.templateVersion,
  ]
}

export function dayGridCellRefs(): string[] {
  const refs: string[] = []
  for (let i = 0; i < FORTNIGHT_DAY_COUNT; i++) {
    const row = dayRow(i)
    for (const col of DAY_ROW_COLS) {
      refs.push(`${col}${row}`)
    }
  }
  return refs
}

export function cribCellRefs(): string[] {
  const refs: string[] = []
  for (const col of CRIB_COLUMNS) {
    for (let offset = 0; offset <= 5; offset++) {
      refs.push(`${col}${FIRST_CRIB_ROW + offset}`)
      refs.push(`${col}${SECOND_CRIB_ROW + offset}`)
    }
  }
  return refs
}

export function allTrackedCellRefs(): string[] {
  return [...headerCellRefs(), ...dayGridCellRefs(), ...cribCellRefs()]
}

export type { CellSnapshot, CellValue } from './types.ts'

export function formatCellValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === 'object' && value !== null && 'year' in value) {
    const d = value as { year: number; month: number; day: number }
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.day)}/${pad(d.month)}/${d.year}`
  }
  return String(value)
}
