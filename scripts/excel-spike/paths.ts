import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export const legacyRoot = path.join(repoRoot, 'legacy', 'CribSheets', 'CribSheets')
export const templatePath = path.join(legacyRoot, 'template.xlsm')
export const prodExamplePath = path.join(
  repoRoot,
  'legacy',
  'CribSheets',
  'examples',
  'CASSIE Glynn-1026-Timesheet-SOUTH A-27092026.xlsm',
)
export const spikeOutDir = path.join(repoRoot, 'scripts', 'excel-spike', 'output')

/** Primary data sheet for permanent staff (matches SpreadSheetUpdater). */
export const dataSheetName = 'Timesheet'
export const coverSheetName = 'Timesheet'
