/** Legacy `Timesheet.ExcelFileName` (Models.cs). */
export function timesheetExcelFileName(
  user: { name: string; employeeNumber: string; unitStation: string },
  fortnightEndingIso: string,
): string {
  const name = user.name.trim()
  const spaceIdx = name.indexOf(' ')
  const first = (spaceIdx >= 0 ? name.slice(0, spaceIdx) : name).toUpperCase()
  const rest = spaceIdx >= 0 ? name.slice(spaceIdx) : ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fortnightEndingIso)
  const ddMMyyyy = m ? `${m[3]}${m[2]}${m[1]}` : fortnightEndingIso.replace(/-/g, '')
  return `${first}${rest}-${user.employeeNumber}-Timesheet-${user.unitStation}-${ddMMyyyy}.xlsm`
}
