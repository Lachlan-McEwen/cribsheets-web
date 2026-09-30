import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const libDir = path.dirname(fileURLToPath(import.meta.url))
export const repoRoot = path.resolve(libDir, '../..')

export const legacyCribSheetsRoot = path.join(repoRoot, 'legacy', 'CribSheets', 'CribSheets')

export function templatePath(casual: boolean): string {
  const name = casual ? 'template_casual.xlsm' : 'template.xlsm'
  return path.join(legacyCribSheetsRoot, name)
}

export function prodExamplePath(): string {
  return path.join(
    repoRoot,
    'legacy',
    'CribSheets',
    'examples',
    'CASSIE Glynn-1026-Timesheet-SOUTH A-27092026.xlsm',
  )
}

export function dataSheetName(casual: boolean): string {
  return casual ? 'Timesheet - CASUAL' : 'Timesheet'
}

export function assertTemplateExists(casual: boolean): string {
  const p = templatePath(casual)
  if (!fs.existsSync(p)) {
    throw new Error(`Template not found: ${p}. Run bun run setup:legacy.`)
  }
  return p
}
