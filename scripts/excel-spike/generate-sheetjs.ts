import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'
import type { CellSnapshot } from './cell-refs'
import { dataSheetName } from './paths'

const readWriteOptions: XLSX.ParsingOptions & XLSX.WritingOptions = {
  bookVBA: true,
  cellFormula: true,
  bookType: 'xlsm',
  type: 'buffer',
}

function setCell(sheet: XLSX.WorkSheet, address: string, value: string | number | boolean | null): void {
  if (value === null || value === undefined) {
    delete sheet[address]
    return
  }

  if (typeof value === 'number') {
    sheet[address] = { t: 'n', v: value }
    return
  }

  if (typeof value === 'boolean') {
    sheet[address] = { t: 'b', v: value }
    return
  }

  const text = String(value).replace(/_x000D_/gi, '\r')
  sheet[address] = { t: 's', v: text }
}

export async function generateWithSheetJS(
  cells: CellSnapshot,
  outputPath: string,
  basePath: string,
): Promise<{ hadVbaOnRead: boolean }> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.copyFileSync(basePath, outputPath)

  const data = fs.readFileSync(outputPath)
  const workbook = XLSX.read(data, readWriteOptions)
  const hadVbaOnRead = Boolean(workbook.vbaraw && workbook.vbaraw.length > 0)

  const sheet = workbook.Sheets[dataSheetName]
  if (!sheet) {
    throw new Error(`Sheet "${dataSheetName}" not found. Sheets: ${workbook.SheetNames.join(', ')}`)
  }

  for (const [address, value] of Object.entries(cells)) {
    setCell(sheet, address, value)
  }

  const out = XLSX.write(workbook, readWriteOptions)
  fs.writeFileSync(outputPath, out)

  return { hadVbaOnRead }
}
