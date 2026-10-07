import {
  cribColumn,
  dayCell,
  dayRow,
  FORTNIGHT_DAY_COUNT,
  FIRST_CRIB_ROW,
  HEADER_CELLS,
  SECOND_CRIB_ROW,
} from './cells.ts'
import type { CellSnapshot } from './types.ts'
import type { CribPenalty, TimeSheetDay, TimesheetDocument } from './legacy-types.ts'
import {
  EMPLOYMENT_TYPE_TICK,
  formatDateDdMmYyyy,
  formatDateDdMmYy,
  formatQHours,
  formatShiftChangeTime,
  formatTimeHhMm,
  leaveTypeAbbreviation,
  parseLegacyDate,
  shiftCodeAbbreviation,
  splitEmployeeName,
  timeSpanFromParts,
} from './legacy-format.ts'

export type CellFontStyle = { fontFamily: string; fontSize: number }

export type TimesheetCellWrites = {
  cells: CellSnapshot
  cellFonts: Record<string, CellFontStyle>
}

function parseDateTime(value: string): Date {
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(value.trim())) {
    const [h, m] = value.split(':').map(Number)
    return new Date(1970, 0, 1, h, m ?? 0, 0)
  }
  return parseLegacyDate(value)
}

function setCell(cells: CellSnapshot, address: string, value: string | number | boolean | null): void {
  if (value === null || value === undefined || value === '') return
  cells[address] = value
}

function addCrib(
  crib: CribPenalty | null | undefined,
  cells: CellSnapshot,
  fonts: Record<string, CellFontStyle>,
  column: string,
  row: number,
): void {
  if (!crib) return

  if (crib.started) {
    setCell(cells, `${column}${row}`, formatTimeHhMm(parseDateTime(crib.started)))
  }

  if (crib.broken?.trim()) {
    setCell(cells, `${column}${row + 1}`, crib.broken.trim())
  }

  if (crib.restarted?.trim()) {
    setCell(cells, `${column}${row + 2}`, crib.restarted.trim())
  } else if (crib.breaks?.length) {
    const brokenParts = crib.breaks
      .filter((b) => b.broken)
      .map((b) => formatTimeHhMm(parseDateTime(b.broken!)))
    if (brokenParts.length) setCell(cells, `${column}${row + 1}`, brokenParts.join(', '))

    const restartedParts = crib.breaks
      .filter((b) => b.restarted)
      .map((b) => formatTimeHhMm(parseDateTime(b.restarted!)))
    if (restartedParts.length) setCell(cells, `${column}${row + 2}`, restartedParts.join(', '))
  }

  if (crib.noCrib) setCell(cells, `${column}${row + 3}`, 'no crib')

  if (crib.spoiltMealClaimed) {
    const addr = `${column}${row + 5}`
    cells[addr] = '✔'
    fonts[addr] = { fontFamily: 'Times New Roman', fontSize: 12 }
  }
}

function writeCountryDay(cells: CellSnapshot, row: number, day: TimeSheetDay): void {
  setCell(cells, `AL${row}`, formatDateDdMmYyyy(parseLegacyDate(day.date)))

  if (day.recallCaseNumber?.trim()) setCell(cells, `AM${row}`, day.recallCaseNumber.trim())
  if (day.recallStart) setCell(cells, `AO${row}`, formatTimeHhMm(parseDateTime(day.recallStart)))
  if (day.recallFinish) setCell(cells, `AP${row}`, formatTimeHhMm(parseDateTime(day.recallFinish)))
  if (day.recallAdditionalInformation?.trim()) {
    setCell(cells, `AR${row}`, day.recallAdditionalInformation.trim())
  }
  if (day.recallUnitStation?.trim()) setCell(cells, `AT${row}`, day.recallUnitStation.trim())
  if (day.onCallStart) setCell(cells, `AY${row}`, formatTimeHhMm(parseDateTime(day.onCallStart)))
  if (day.onCallFinish) setCell(cells, `BA${row}`, formatTimeHhMm(parseDateTime(day.onCallFinish)))
  if (day.onCallAdditionalInformation?.trim()) {
    setCell(cells, `BC${row}`, day.onCallAdditionalInformation.trim())
  }
  if (day.onCallUnitStation?.trim()) setCell(cells, `BE${row}`, day.onCallUnitStation.trim())
}

function writeEmploymentType(cells: CellSnapshot, isCountryEmployee: boolean): void {
  if (isCountryEmployee) {
    setCell(cells, HEADER_CELLS.countryEmployment, EMPLOYMENT_TYPE_TICK)
  } else {
    setCell(cells, HEADER_CELLS.metroEmployment, EMPLOYMENT_TYPE_TICK)
  }
}

/** Port of `SpreadSheetUpdater.WriteSpreadSheet` cell writes (permanent staff sheet). */
export function timesheetDocumentToCellWrites(doc: TimesheetDocument): TimesheetCellWrites {
  const cells: CellSnapshot = {}
  const cellFonts: Record<string, CellFontStyle> = {}

  const fortnightEnding = parseLegacyDate(doc.fortnightEnding)
  const fortnightStr = formatDateDdMmYyyy(fortnightEnding)
  cells[HEADER_CELLS.fortnightEnding] = fortnightStr

  const { surname, firstName } = splitEmployeeName(doc.user.name)
  setCell(cells, HEADER_CELLS.surname, surname)
  setCell(cells, HEADER_CELLS.firstName, firstName)
  setCell(cells, HEADER_CELLS.employeeNumber, doc.user.employeeNumber)
  setCell(cells, HEADER_CELLS.unitStation, doc.user.unitStation)
  writeEmploymentType(cells, doc.user.isCountryEmployee ?? false)

  let shiftChanges = 0

  for (let i = 0; i < FORTNIGHT_DAY_COUNT; i++) {
    const day = doc.days[i]
    if (!day) continue

    const row = dayRow(i)
    setCell(cells, dayCell(i, 'B'), formatDateDdMmYyyy(parseLegacyDate(day.date)))

    if (day.start) setCell(cells, dayCell(i, 'C'), formatTimeHhMm(parseDateTime(day.start)))
    if (day.end) setCell(cells, dayCell(i, 'D'), formatTimeHhMm(parseDateTime(day.end)))

    const meals = timeSpanFromParts(day.mealsHours, day.mealsMinutes)
    if (meals) setCell(cells, dayCell(i, 'E'), formatQHours(meals.hours, meals.minutes))

    const rostered = timeSpanFromParts(day.rosteredHours, day.rosteredMinutes)
    if (rostered) setCell(cells, dayCell(i, 'F'), formatQHours(rostered.hours, rostered.minutes))

    const overtime = timeSpanFromParts(day.overtimeHours, day.overtimeMinutes)
    if (overtime) setCell(cells, dayCell(i, 'H'), formatQHours(overtime.hours, overtime.minutes))

    const shiftAbbr = shiftCodeAbbreviation(day.shiftCode)
    if (shiftAbbr) setCell(cells, dayCell(i, 'M'), shiftAbbr)

    const leaveAbbr = leaveTypeAbbreviation(day.leaveType)
    if (leaveAbbr) setCell(cells, dayCell(i, 'N'), leaveAbbr)

    if (day.sickCertificate && day.sickCertificate !== 'None') {
      setCell(cells, dayCell(i, 'P'), day.sickCertificate)
    }

    const leave = timeSpanFromParts(day.leaveHours, day.leaveMinutes)
    if (leave) setCell(cells, dayCell(i, 'Q'), formatQHours(leave.hours, leave.minutes))

    if (day.additionalInformation != null) cells[dayCell(i, 'S')] = day.additionalInformation
    if (day.unitStation != null) cells[dayCell(i, 'W')] = day.unitStation

    const cribCol = cribColumn(i)
    addCrib(day.firstCribPenalty, cells, cellFonts, cribCol, FIRST_CRIB_ROW)
    addCrib(day.secondCribPenalty, cells, cellFonts, cribCol, SECOND_CRIB_ROW)

    if (day.shiftChangeNotified || day.kms != null) {
      const scRow = 40 + shiftChanges
      if (day.shiftChangeNotified) {
        const notified = parseLegacyDate(day.shiftChangeNotified)
        setCell(cells, `AM${scRow}`, formatDateDdMmYyyy(notified))
        setCell(cells, `AN${scRow}`, formatShiftChangeTime(notified))
      }
      if (shiftAbbr) setCell(cells, `AO${scRow}`, shiftAbbr)
      setCell(cells, `AP${scRow}`, formatDateDdMmYy(parseLegacyDate(day.date)))
      if (day.kms != null) setCell(cells, `AQ${scRow}`, String(day.kms))

      shiftChanges++
      if (shiftChanges === 3 || shiftChanges === 5) shiftChanges++
    }

    if (doc.user.isCountryEmployee) writeCountryDay(cells, row, day)
  }

  if (doc.user.isCountryEmployee && doc.excessOnCallHoursClaimed?.trim()) {
    cells[HEADER_CELLS.excessOnCallHours] = doc.excessOnCallHoursClaimed.trim()
  }

  return { cells, cellFonts }
}

export function timesheetDocumentToCellSnapshot(doc: TimesheetDocument): CellSnapshot {
  return timesheetDocumentToCellWrites(doc).cells
}
