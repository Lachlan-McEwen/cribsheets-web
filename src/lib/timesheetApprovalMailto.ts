import { timesheetExcelFileName } from '../../lib/timesheet-export/excel-file-name.ts'
import type { TimesheetDocument } from '../../lib/timesheet-export/legacy-types.ts'
import { formatDateAu, parseIsoDate } from './format.ts'

/** Opens the user's mail client; attachment must be added manually. */
export function timesheetApprovalMailtoUrl(
  document: TimesheetDocument,
  hasGeneratedSpreadsheet: boolean,
  authorisingManagerEmail?: string,
): string {
  const { user, fortnightEnding } = document
  const endingLabel = formatDateAu(parseIsoDate(fortnightEnding))
  const subject = `Timesheet for approval — ${user.name.trim() || 'Employee'} — fortnight ending ${endingLabel}`

  const lines = [
    'Hi,',
    '',
    `Please review and sign my fortnight timesheet (ending ${endingLabel}).`,
    '',
  ]

  if (hasGeneratedSpreadsheet) {
    const fileName = timesheetExcelFileName(user, fortnightEnding)
    lines.push(
      `Please attach the spreadsheet file: ${fileName}`,
      '(Use Download on Crib Sheets if you need a fresh copy.)',
    )
  } else {
    lines.push(
      'On Crib Sheets: Generate Timesheet, then Download, and attach that .xlsm file to this email.',
    )
  }

  lines.push('', 'Thanks.')

  const params = new URLSearchParams()
  const manager = authorisingManagerEmail?.trim().toLowerCase()
  if (manager) params.set('to', manager)
  params.set('subject', subject)
  params.set('body', lines.join('\r\n'))
  return `mailto:?${params.toString()}`
}
