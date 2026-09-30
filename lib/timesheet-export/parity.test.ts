import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  compareTrackedCells,
  extractSignatureAnchorXml,
  extractTrackedCellsFromWorkbook,
  generateTimesheetWithDotNet,
  generateTimesheetXlsm,
  preservationScore,
  prodExamplePath,
  templatePath,
} from './index.ts'

const testPng = path.join(import.meta.dir, '../../scripts/excel-spike/fixtures/test-signature.png')
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cribsheets-export-parity-'))

beforeAll(() => {
  if (!fs.existsSync(templatePath(false))) {
    throw new Error('Legacy template missing — run bun run setup:legacy')
  }
  if (!fs.existsSync(prodExamplePath())) {
    throw new Error('Prod example missing under legacy/CribSheets/examples')
  }
  if (!fs.existsSync(testPng)) {
    throw new Error(`Missing ${testPng}`)
  }
})

afterAll(() => {
  fs.rmSync(outDir, { recursive: true, force: true })
})

describe('timesheet export (Node vs .NET)', () => {
  let cells: Awaited<ReturnType<typeof extractTrackedCellsFromWorkbook>>
  let nodeOut: string
  let dotnetOut: string

  beforeAll(async () => {
    cells = await extractTrackedCellsFromWorkbook(prodExamplePath())
    expect(Object.keys(cells).length).toBeGreaterThan(30)

    nodeOut = path.join(outDir, 'parity-node.xlsm')
    dotnetOut = path.join(outDir, 'parity-dotnet.xlsm')

    await generateTimesheetXlsm({
      outputPath: nodeOut,
      cells,
      staffSignaturePngPath: testPng,
      patchPackageFromReference: prodExamplePath(),
    })

    await generateTimesheetWithDotNet(cells, dotnetOut, false, testPng)
  }, 180_000)

  test('tracked cells match between Node and .NET', async () => {
    const report = await compareTrackedCells(dotnetOut, nodeOut)
    if (report.cellMismatches.length > 0) {
      console.log(
        'Cell mismatches:',
        report.cellMismatches.slice(0, 15).map((m) => `${m.cell}: dotnet="${m.reference}" node="${m.candidate}"`),
      )
    }
    expect(report.cellMismatches).toEqual([])
  }, 60_000)

  test('staff signature OOXML matches (legacy AddImage 36,1)', () => {
    const normalize = (s: string | null) => s?.replace(/\bid="\d+"/g, 'id="*"') ?? null
    const dotnetAnchor = normalize(extractSignatureAnchorXml(dotnetOut))
    const nodeAnchor = normalize(extractSignatureAnchorXml(nodeOut))
    expect(nodeAnchor).toBe(dotnetAnchor)
    expect(nodeAnchor).toContain('name="Signature"')
    expect(nodeAnchor).toContain('<xdr:row>36</xdr:row>')
    expect(nodeAnchor).toContain('<xdr:col>1</xdr:col>')
  })

  test('package preservation vs template (ActiveX + VBA size)', () => {
    const score = preservationScore(templatePath(false), nodeOut)
    expect(score.missingCriticalParts).toEqual([])
    expect(score.activeXCandidate).toBe(score.activeXTemplate)
    expect(score.vbaSizeMatch).toBe(true)
  })

  test('Node vs prod example (tracked subset — expect some drift)', async () => {
    const report = await compareTrackedCells(prodExamplePath(), nodeOut)
    console.log(
      `Node vs prod tracked mismatches: ${report.cellMismatches.length} (subset of legacy cells only)`,
    )
    expect(report.cellMismatches.length).toBeLessThan(30)
  }, 60_000)
})
