import { describe, expect, test } from 'bun:test'
import { cribColumn, dayCell, dayRow, HEADER_CELLS } from './cells.ts'

describe('timesheet cell layout helpers', () => {
  test('day row 0 maps to legacy row 20', () => {
    expect(dayRow(0)).toBe(20)
    expect(dayCell(0, 'C')).toBe('C20')
    expect(dayCell(0, 'D')).toBe('D20')
  })

  test('crib column follows day index', () => {
    expect(cribColumn(0)).toBe('O')
    expect(cribColumn(1)).toBe('Q')
  })

  test('header cells match e2e smoke expectations', () => {
    expect(HEADER_CELLS.employeeNumber).toBe('AA5')
    expect(HEADER_CELLS.unitStation).toBe('D8')
    expect(HEADER_CELLS.surname).toBe('F5')
  })
})
