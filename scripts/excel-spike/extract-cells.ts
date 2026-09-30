import { extractTrackedCellsFromWorkbook } from '../../lib/timesheet-export/extract-cells.ts'
import { dataSheetName } from './paths'

export async function extractCellsFromWorkbook(
  filePath: string,
  sheet = dataSheetName,
): Promise<import('../../lib/timesheet-export/cells.ts').CellSnapshot> {
  const casual = sheet !== 'Timesheet'
  return extractTrackedCellsFromWorkbook(filePath, casual)
}
