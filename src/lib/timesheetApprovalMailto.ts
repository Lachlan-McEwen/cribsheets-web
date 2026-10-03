import type { TimesheetDocument } from '../../lib/timesheet-export/legacy-types.ts'
import { formatDateAu, parseIsoDate } from './format.ts'

/** Opens the user's mail client with manager and subject prefilled; body is left empty. */
export function timesheetApprovalMailtoUrl(
  document: TimesheetDocument,
  authorisingManagerEmail?: string,
): string {
  const { user, fortnightEnding } = document
  const endingLabel = formatDateAu(parseIsoDate(fortnightEnding))
  const subject = `Timesheet for approval — ${user.name.trim() || 'Employee'} — fortnight ending ${endingLabel}`

  const query: string[] = []
  const manager = authorisingManagerEmail?.trim().toLowerCase()
  if (manager) query.push(`to=${encodeURIComponent(manager)}`)
  // Use encodeURIComponent (%20), not URLSearchParams (+), so Outlook/desktop clients decode spaces.
  query.push(`subject=${encodeURIComponent(subject)}`)
  return `mailto:?${query.join('&')}`
}
