import fs from 'node:fs'
import path from 'node:path'
import { generateTimesheetFromDocument } from '../../lib/timesheet-export/generate-from-document.js'
import { timesheetExcelFileName } from '../../lib/timesheet-export/excel-file-name.js'
import type { TimesheetDocument } from '../../lib/timesheet-export/legacy-types.js'
import { assertTemplateExists } from '../../lib/timesheet-export/templates.js'
import type { UserRow } from './db.js'
import { OUTPUT_DIR } from './outputDir.js'
import { signaturePathForUser, userHasSignature } from './signatures.js'

export function outputPathForFileName(fileName: string): string {
  const safe = path.basename(fileName)
  if (safe !== fileName || fileName.includes('..')) {
    throw new Error('invalid_output_name')
  }
  return path.join(OUTPUT_DIR, safe)
}

export function buildExcelFileName(user: UserRow, fortnightEnding: string): string {
  return timesheetExcelFileName(
    { name: user.name, employeeNumber: user.employeeNumber, unitStation: user.unitStation },
    fortnightEnding,
  )
}

export async function writeTimesheetXlsm(
  user: UserRow,
  fortnightEnding: string,
  document: TimesheetDocument,
): Promise<string> {
  if (!user.name.trim() || !user.employeeNumber.trim() || !user.unitStation.trim()) {
    throw new Error('profile_incomplete')
  }

  const casual = user.casual
  const fileName = buildExcelFileName(user, fortnightEnding)
  const outputPath = outputPathForFileName(fileName)

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath)
  }

  const staffSignaturePngPath =
    !casual && userHasSignature(user.id) ? signaturePathForUser(user.id) : undefined

  await generateTimesheetFromDocument({
    outputPath,
    timesheet: document,
    staffSignaturePngPath,
    patchPackageFromReference: assertTemplateExists(casual),
  })

  return fileName
}
