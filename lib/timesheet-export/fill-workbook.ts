import fs from 'node:fs'
import path from 'node:path'
import XlsxPopulate from 'xlsx-populate'
import { HEADER_CELLS } from './cells.ts'
import type { CellFontStyle, CellSnapshot } from './types.ts'
import { dataSheetName } from './templates.ts'

function normalizeCellValue(value: string | number | boolean | null): string | number | boolean | null {
  if (typeof value === 'string') return value.replace(/_x000D_/gi, '\r')
  return value
}

export async function fillWorkbookFromSnapshot(
  baseTemplatePath: string,
  outputPath: string,
  cells: CellSnapshot,
  casual: boolean,
  cellFonts: Record<string, CellFontStyle> = {},
): Promise<void> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.copyFileSync(baseTemplatePath, outputPath)

  const workbook = await XlsxPopulate.fromFileAsync(outputPath)
  const sheetName = dataSheetName(casual)
  const sheet = workbook.sheet(sheetName)

  for (const [address, value] of Object.entries(cells)) {
    sheet.cell(address).value(normalizeCellValue(value))
  }

  // Legacy sets AA8 on Worksheets.First() as well as the data sheet.
  const fortnightCell = HEADER_CELLS.fortnightEnding
  if (cells[fortnightCell] !== undefined && cells[fortnightCell] !== null) {
    workbook.sheet(0).cell(fortnightCell).value(normalizeCellValue(cells[fortnightCell]))
  }

  for (const [address, font] of Object.entries(cellFonts)) {
    sheet.cell(address).style('fontFamily', font.fontFamily).style('fontSize', font.fontSize)
  }

  await workbook.toFileAsync(outputPath)
}
