import XlsxPopulate from 'xlsx-populate'
import { HEADER_CELLS } from './cells.ts'
import { assertTemplateExists } from './templates.ts'

/** Legacy `SpreadSheetUpdater.GetTemplateVersion` — `Worksheets[0].AD1`. */
export async function getTemplateVersion(casual: boolean): Promise<string> {
  const templatePath = assertTemplateExists(casual)
  const workbook = await XlsxPopulate.fromFileAsync(templatePath)
  const sheet = workbook.sheet(0)
  const value = sheet.cell(HEADER_CELLS.templateVersion).value()
  if (value === null || value === undefined) return ''
  return String(value).trim()
}
