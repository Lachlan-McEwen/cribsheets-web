import fs from 'node:fs'
import path from 'node:path'
import ExcelJS from 'exceljs'
import type { CellSnapshot } from './cell-refs'
import { coverSheetName, dataSheetName } from './paths'

export async function generateWithExcelJs(
  cells: CellSnapshot,
  outputPath: string,
  basePath: string,
): Promise<void> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.copyFileSync(basePath, outputPath)

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(outputPath)

  const dataSheet = workbook.getWorksheet(dataSheetName)
  const coverSheet = workbook.getWorksheet(coverSheetName)
  if (!dataSheet || !coverSheet) {
    throw new Error(`Expected worksheets "${dataSheetName}" and "${coverSheetName}"`)
  }

  for (const [address, value] of Object.entries(cells)) {
    dataSheet.getCell(address).value = value
  }

  if (cells.AA8 != null) {
    coverSheet.getCell('AA8').value = cells.AA8
  }

  await workbook.xlsx.writeFile(outputPath)
}
