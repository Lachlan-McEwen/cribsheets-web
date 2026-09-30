import fs from 'node:fs'
import path from 'node:path'
import { Workbook } from '@sheetkit/node'
import type { CellSnapshot } from './cell-refs'
import { coverSheetName, dataSheetName } from './paths'

export async function generateWithSheetKit(
  cells: CellSnapshot,
  outputPath: string,
  basePath: string,
): Promise<void> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.copyFileSync(basePath, outputPath)

  const wb = await Workbook.open(outputPath, {
    readMode: 'lazy',
    auxParts: 'deferred',
  })

  for (const [cell, value] of Object.entries(cells)) {
    wb.setCellValue(dataSheetName, cell, normalizeCellValue(value))
  }

  const fortnight = cells.AA8
  if (fortnight != null) {
    wb.setCellValue(coverSheetName, 'AA8', fortnight)
  }

  wb.saveSync(outputPath)
}

export function normalizeCellValue(value: string | number | boolean): string | number | boolean {
  if (typeof value !== 'string') return value
  return value.replace(/_x000D_/gi, '\r').replace(/\r\n/g, '\n')
}
