import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { normalizeCellDisplay, compareTrackedCells } from './compare-workbooks.ts'
import { generateTimesheetFromDocument } from './generate-from-document.ts'
import { generateTimesheetWithDotNet } from './dotnet-generate.ts'
import type { TimesheetDocument } from './legacy-types.ts'
import { timesheetDocumentToCellWrites } from './timesheet-to-cells.ts'
import { prodExamplePath } from './templates.ts'

const fixturePath = path.join(import.meta.dir, 'fixtures/cassie-timesheet.json')
const prodCellsPath = path.join(
  import.meta.dir,
  '../../scripts/excel-spike/output/cassie-from-prod.cells.json',
)
const testPng = path.join(import.meta.dir, '../../scripts/excel-spike/fixtures/test-signature.png')
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cribsheets-timesheet-doc-'))

afterAll(() => fs.rmSync(outDir, { recursive: true, force: true }))

describe('TimesheetDocument → cells (legacy Models shape)', () => {
  let doc: TimesheetDocument
  let prodCells: Record<string, string>

  beforeAll(() => {
    doc = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as TimesheetDocument
    if (fs.existsSync(prodCellsPath)) {
      prodCells = JSON.parse(fs.readFileSync(prodCellsPath, 'utf8'))
    }
  })

  test('maps CASSIE-like fixture onto prod cell snapshot (tracked overlap)', () => {
    expect(prodCells).toBeDefined()
    const { cells } = timesheetDocumentToCellWrites(doc)

    const mismatches: string[] = []
    for (const [address, prodValue] of Object.entries(prodCells!)) {
      if (address === 'AD1' || address === 'F5') continue
      if (!(address in cells)) continue
      const built = normalizeCellDisplay(String(cells[address] ?? ''))
      const prod = normalizeCellDisplay(prodValue ?? null)
      if (built !== prod) mismatches.push(`${address}: built="${built}" prod="${prod}"`)
    }

    if (mismatches.length) console.log('Fixture vs prod cells:', mismatches.slice(0, 12))
    expect(mismatches.length).toBeLessThanOrEqual(2)
  })

  test('document export matches .NET on tracked grid', async () => {
    const nodeOut = path.join(outDir, 'cassie-from-document-node.xlsm')
    const dotnetOut = path.join(outDir, 'cassie-from-document-dotnet.xlsm')
    const { cells } = timesheetDocumentToCellWrites(doc)

    await generateTimesheetFromDocument({
      outputPath: nodeOut,
      timesheet: doc,
      staffSignaturePngPath: testPng,
      patchPackageFromReference: prodExamplePath(),
    })

    await generateTimesheetWithDotNet(cells, dotnetOut, false, testPng)

    const report = await compareTrackedCells(dotnetOut, nodeOut)
    if (report.cellMismatches.length) {
      console.log(report.cellMismatches.slice(0, 10))
    }
    expect(report.cellMismatches).toEqual([])
  }, 120_000)
})
