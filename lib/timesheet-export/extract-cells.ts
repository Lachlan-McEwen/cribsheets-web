import { Workbook } from '@sheetkit/node'
import { allTrackedCellRefs, formatCellValue, type CellSnapshot } from './cells.ts'
import { dataSheetName } from './templates.ts'

export async function extractTrackedCellsFromWorkbook(
  filePath: string,
  casual = false,
): Promise<CellSnapshot> {
  const sheet = dataSheetName(casual)
  const wb = await Workbook.open(filePath, { readMode: 'eager', auxParts: 'eager' })
  const snapshot: CellSnapshot = {}

  for (const cell of allTrackedCellRefs()) {
    const formatted = wb.getCellFormattedValue(sheet, cell)
    const raw = wb.getCellValue(sheet, cell)
    const value =
      formatted && formatted.trim() !== '' ? formatted.trim() : formatCellValue(raw)
    if (value !== null && value !== '') {
      snapshot[cell] = value
    }
  }

  return snapshot
}
