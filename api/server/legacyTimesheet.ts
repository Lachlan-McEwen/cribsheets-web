import fs from 'node:fs'
import type { StoredTimesheetPayload } from './timesheetStore.js'
import { outputPathForFileName } from './timesheetExport.js'

function readStringField(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

/** Pull envelope fields off a legacy MVC timesheet body before storing as `document`. */
export function normalizeLegacyTimesheetBody(body: Record<string, unknown>): {
  document: Record<string, unknown>
  googleFileId: string | null
  outputFileName: string | null
} {
  const googleFileId = readStringField(body, 'googleFileId', 'GoogleFileId')
  const outputFileName = readStringField(body, 'outputFileName', 'OutputFileName', 'excelFileName', 'ExcelFileName')

  const document: Record<string, unknown> = { ...body }
  for (const key of [
    'lastUpdated',
    'LastUpdated',
    'googleFileId',
    'GoogleFileId',
    'outputFileName',
    'OutputFileName',
    'excelFileName',
    'ExcelFileName',
    'hasOutput',
    'HasOutput',
    'user',
    'User',
  ]) {
    delete document[key]
  }

  return { document, googleFileId, outputFileName }
}

export function legacyTimesheetResponse(
  fortnightEnding: string,
  stored: StoredTimesheetPayload,
): Record<string, unknown> {
  const hasOutput = Boolean(
    stored.outputFileName && fs.existsSync(outputPathForFileName(stored.outputFileName)),
  )

  const timesheet: Record<string, unknown> = {
    ...stored.document,
    fortnightEnding,
    FortnightEnding: fortnightEnding,
    lastUpdated: stored.lastUpdated,
    LastUpdated: new Date(stored.lastUpdated).toISOString(),
    googleFileId: stored.googleFileId,
    GoogleFileId: stored.googleFileId ?? '',
    outputFileName: stored.outputFileName,
    hasOutput,
    HasOutput: hasOutput,
  }

  return {
    timesheet,
    lastUpdated: stored.lastUpdated,
    googleFileId: stored.googleFileId,
    outputFileName: stored.outputFileName,
    hasOutput,
  }
}
