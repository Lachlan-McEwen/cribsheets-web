import fs from 'node:fs'
import path from 'node:path'
import { Workbook } from '@sheetkit/node'
import XlsxPopulate from 'xlsx-populate'
import { spikeOutDir, templatePath } from './paths'

async function testSheetKitOneCell(out: string) {
  fs.copyFileSync(templatePath, out)
  const wb = await Workbook.open(out, { readMode: 'lazy', auxParts: 'deferred' })
  wb.setCellValue('Timesheet', 'AA8', '27/09/2026')
  wb.saveSync(out)
}

async function testXlsxPopulateOneCell(out: string) {
  const wb = await XlsxPopulate.fromFileAsync(templatePath)
  wb.sheet('Timesheet').cell('AA8').value('27/09/2026')
  await wb.toFileAsync(out)
}

async function main() {
  fs.mkdirSync(spikeOutDir, { recursive: true })
  const sk = path.join(spikeOutDir, 'minimal-sheetkit.xlsm')
  const xp = path.join(spikeOutDir, 'minimal-xlsx-populate.xlsm')
  await testSheetKitOneCell(sk)
  await testXlsxPopulateOneCell(xp)
  console.log('Wrote', sk)
  console.log('Wrote', xp)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
