import { describe, expect, test } from 'bun:test'
import type { TimeSheetDay, TimesheetDocument } from '../timesheet-export/legacy-types.ts'
import { collapsedDaySummary } from './day-summary.ts'
import { applyDefaultShiftCode, normalizeTimesheetDocumentForSave } from './normalize-document.ts'
import { applyStartWithDefaultShiftHours } from './start-defaults.ts'
import { filterDurationDraft, formatDurationFromParts, parseDurationHhMm } from './duration-input.ts'
import { formatMinutesAsHoursMinutes, minutesBetweenClockTimes } from './shift-span.ts'
import {
  addDecimalHoursToTime,
  decimalHoursFromDurationParts,
  defaultShiftDurationParts,
  normalizeTimeOfDayInput,
} from './time.ts'

describe('timesheet-form time', () => {
  test('normalizeTimeOfDayInput accepts HH:mm and digit runs', () => {
    expect(normalizeTimeOfDayInput('8:0')).toBe('08:00')
    expect(normalizeTimeOfDayInput('800')).toBe('08:00')
    expect(normalizeTimeOfDayInput('')).toBeNull()
  })

  test('addDecimalHoursToTime matches legacy startChanged end', () => {
    expect(addDecimalHoursToTime('08:00', 8)).toBe('16:00')
    expect(addDecimalHoursToTime('08:00', 10.5)).toBe('18:30')
  })

  test('default shift duration parts round-trip', () => {
    expect(defaultShiftDurationParts(10.5)).toEqual({ hours: 10, minutes: 30 })
    expect(decimalHoursFromDurationParts(10, 30)).toBe(10.5)
    expect(decimalHoursFromDurationParts(null, null)).toBeNull()
  })
})

describe('applyStartWithDefaultShiftHours', () => {
  const base: TimeSheetDay = {
    date: '2026-09-14',
    shiftCode: 'None',
    leaveType: 'None',
    sickCertificate: 'None',
  }

  test('fills rostered and end when empty', () => {
    const patch = applyStartWithDefaultShiftHours({ ...base, start: '07:00' }, 10)
    expect(patch.rosteredHours).toBe(10)
    expect(patch.rosteredMinutes).toBe(0)
    expect(patch.end).toBe('17:00')
  })

  test('does not overwrite existing rostered hours', () => {
    const patch = applyStartWithDefaultShiftHours(
      { ...base, start: '07:00', rosteredHours: 8, rosteredMinutes: 30 },
      10,
    )
    expect(patch.rosteredHours).toBeUndefined()
    expect(patch.end).toBe('17:00')
  })
})

describe('normalizeTimesheetDocumentForSave', () => {
  test('strips blank crib breaks', () => {
    const doc: TimesheetDocument = {
      fortnightEnding: '2026-09-27',
      user: { name: 'A', employeeNumber: '1', unitStation: 'X', casual: false },
      days: [
        {
          date: '2026-09-14',
          firstCribPenalty: {
            breaks: [{ broken: '12:00', restarted: '12:30' }, {}, {}],
          },
        },
      ],
    }
    const saved = normalizeTimesheetDocumentForSave(doc)
    expect(saved.days[0].firstCribPenalty?.breaks).toHaveLength(1)
  })
})

describe('applyDefaultShiftCode', () => {
  test('sets None days from profile default', () => {
    const doc: TimesheetDocument = {
      fortnightEnding: '2026-09-27',
      user: { name: 'A', employeeNumber: '1', unitStation: 'X', casual: false },
      days: [{ date: '2026-09-14', shiftCode: 'None' }],
    }
    const next = applyDefaultShiftCode(doc, 'Emergency')
    expect(next.days[0].shiftCode).toBe('Emergency')
  })
})

describe('duration input', () => {
  test('filterDurationDraft strips non-numeric except one colon', () => {
    expect(filterDurationDraft('10:30am')).toBe('10:30')
    expect(filterDurationDraft('1:2:3')).toBe('1:23')
  })

  test('round-trips 24h-style HH:mm length', () => {
    expect(formatDurationFromParts(13, 42)).toBe('13:42')
    expect(parseDurationHhMm('10:30')).toEqual({ hours: 10, minutes: 30 })
    expect(parseDurationHhMm('1030')).toEqual({ hours: 10, minutes: 30 })
    expect(formatDurationFromParts(null, null)).toBe('')
  })
})

describe('shift span', () => {
  test('computes same-day and overnight spans', () => {
    expect(minutesBetweenClockTimes('08:00', '16:00')).toBe(8 * 60)
    expect(minutesBetweenClockTimes('22:00', '06:00')).toBe(8 * 60)
    expect(formatMinutesAsHoursMinutes(510)).toBe('8 h 30 min')
  })
})

describe('collapsedDaySummary', () => {
  test('includes times and leave, not shift letter', () => {
    const summary = collapsedDaySummary({
      date: '2026-09-14',
      shiftCode: 'Emergency',
      start: '08:00',
      end: '16:00',
    })
    expect(summary).toBe('08:00–16:00')
    expect(summary).not.toContain('E')
  })
})
