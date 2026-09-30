const dayRowCols = ['B', 'C', 'D', 'E', 'F', 'H', 'M', 'N', 'P', 'Q', 'S', 'W'] as const
const cribColumns = ['O', 'Q', 'S', 'T', 'U', 'V', 'X', 'Z', 'AB', 'AC', 'AE', 'AG', 'AI', 'AJ'] as const
const firstCribRow = 38
const secondCribRow = 46

export function headerCellRefs(): string[] {
  return ['AA8', 'F5', 'S5', 'AA5', 'D8', 'M8', 'M9', 'AD1']
}

export function dayGridCellRefs(): string[] {
  const refs: string[] = []
  for (let i = 0; i < 14; i++) {
    const row = i + 20
    for (const col of dayRowCols) {
      refs.push(`${col}${row}`)
    }
  }
  return refs
}

export function cribCellRefs(): string[] {
  const refs: string[] = []
  for (const col of cribColumns) {
    for (let offset = 0; offset <= 5; offset++) {
      refs.push(`${col}${firstCribRow + offset}`)
      refs.push(`${col}${secondCribRow + offset}`)
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
