import type { CribBreak, CribPenalty, ShiftCode, TimeSheetDay, TimesheetDocument } from '../timesheet-export/legacy-types.ts'
import { normalizeHourInput, normalizeMinuteInput } from './time.ts'

const SHIFT_CODES: ShiftCode[] = [
  'None',
  'Administration',
  'Communications',
  'Emergency',
  'Function',
  'RMTS',
  'Training',
  'CommParamedic',
]

function isBlankBreak(brk: CribBreak): boolean {
  return !brk.broken?.trim() && !brk.restarted?.trim()
}

export function stripBlankCribBreaks(crib: CribPenalty | null | undefined): CribPenalty | null | undefined {
  if (!crib?.breaks?.length) return crib
  const breaks = crib.breaks.filter((b) => !isBlankBreak(b))
  return { ...crib, breaks }
}

export function ensureCribBreakSlots(crib: CribPenalty | null | undefined, slotCount = 10): CribPenalty {
  const base = crib ?? { breaks: [] }
  const breaks = [...(base.breaks ?? [])]
  while (breaks.length < slotCount) breaks.push({})
  return { ...base, breaks }
}

function normalizeDayDurations(day: TimeSheetDay): TimeSheetDay {
  return {
    ...day,
    rosteredHours:
      day.rosteredHours != null
        ? normalizeHourInput(String(day.rosteredHours))
        : day.rosteredHours,
    rosteredMinutes:
      day.rosteredMinutes != null
        ? normalizeMinuteInput(String(day.rosteredMinutes))
        : day.rosteredMinutes,
    overtimeHours:
      day.overtimeHours != null ? normalizeHourInput(String(day.overtimeHours)) : day.overtimeHours,
    overtimeMinutes:
      day.overtimeMinutes != null
        ? normalizeMinuteInput(String(day.overtimeMinutes))
        : day.overtimeMinutes,
    mealsHours:
      day.mealsHours != null ? normalizeHourInput(String(day.mealsHours)) : day.mealsHours,
    mealsMinutes:
      day.mealsMinutes != null ? normalizeMinuteInput(String(day.mealsMinutes)) : day.mealsMinutes,
    leaveHours:
      day.leaveHours != null ? normalizeHourInput(String(day.leaveHours)) : day.leaveHours,
    leaveMinutes:
      day.leaveMinutes != null ? normalizeMinuteInput(String(day.leaveMinutes)) : day.leaveMinutes,
    firstCribPenalty: day.firstCribPenalty
      ? ensureCribBreakSlots(stripBlankCribBreaks(day.firstCribPenalty) ?? day.firstCribPenalty)
      : ensureCribBreakSlots(null),
    secondCribPenalty: day.secondCribPenalty
      ? ensureCribBreakSlots(stripBlankCribBreaks(day.secondCribPenalty) ?? day.secondCribPenalty)
      : ensureCribBreakSlots(null),
  }
}

/** Legacy Index GET: default shift code when day still `None`. */
export function applyDefaultShiftCode(
  document: TimesheetDocument,
  defaultShiftCode: string | null | undefined,
): TimesheetDocument {
  if (!defaultShiftCode || defaultShiftCode === 'None' || !SHIFT_CODES.includes(defaultShiftCode as ShiftCode)) {
    return document
  }
  const code = defaultShiftCode as ShiftCode
  return {
    ...document,
    days: document.days.map((day) =>
      !day.shiftCode || day.shiftCode === 'None' ? { ...day, shiftCode: code } : day,
    ),
  }
}

export function normalizeTimesheetForUi(document: TimesheetDocument): TimesheetDocument {
  return {
    ...document,
    days: document.days.map((day) => normalizeDayDurations(day)),
  }
}

/** MVC POST: remove blank crib breaks before persist (UI re-expands slots on load). */
export function normalizeTimesheetDocumentForSave(document: TimesheetDocument): TimesheetDocument {
  return {
    ...document,
    days: document.days.map((day) => ({
      ...day,
      firstCribPenalty: stripBlankCribBreaks(day.firstCribPenalty) ?? day.firstCribPenalty,
      secondCribPenalty: stripBlankCribBreaks(day.secondCribPenalty) ?? day.secondCribPenalty,
    })),
  }
}

export function prepareLoadedTimesheet(
  document: TimesheetDocument,
  defaultShiftCode: string | null | undefined,
): TimesheetDocument {
  return normalizeTimesheetForUi(applyDefaultShiftCode(document, defaultShiftCode))
}
