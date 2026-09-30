import fs from 'node:fs'
import AdmZip from 'adm-zip'
import { Workbook } from '@sheetkit/node'
import { allTrackedCellRefs, type CellSnapshot } from './cell-refs'
import { dataSheetName } from './paths'

export type ZipPartSummary = {
  part: string
  bytes: number
}

export function listZipParts(filePath: string): ZipPartSummary[] {
  const zip = new AdmZip(filePath)
  return zip
    .getEntries()
    .map((entry) => ({
      part: entry.entryName.replace(/\\/g, '/'),
      bytes: entry.header.size,
    }))
    .sort((a, b) => a.part.localeCompare(b.part))
}

async function readCells(filePath: string): Promise<CellSnapshot> {
  const wb = await Workbook.open(filePath, { readMode: 'eager', auxParts: 'eager' })
  const out: CellSnapshot = {}
  for (const cell of allTrackedCellRefs()) {
    out[cell] = wb.getCellFormattedValue(dataSheetName, cell) || null
  }
  return out
}

export type CompareReport = {
  reference: string
  candidate: string
  cellMismatches: { cell: string; reference: string | null; candidate: string | null }[]
  referenceVbaBytes: number | null
  candidateVbaBytes: number | null
  referencePrinterParts: number
  candidatePrinterParts: number
  zipPartsOnlyInReference: string[]
  zipPartsOnlyInCandidate: string[]
  zipPartSizeDeltas: { part: string; referenceBytes: number; candidateBytes: number }[]
}

export async function compareWorkbooks(
  referencePath: string,
  candidatePath: string,
): Promise<CompareReport> {
  const [refCells, candCells] = await Promise.all([
    readCells(referencePath),
    readCells(candidatePath),
  ])

  const cellMismatches: CompareReport['cellMismatches'] = []
  for (const cell of allTrackedCellRefs()) {
    const reference = refCells[cell] ?? null
    const candidate = candCells[cell] ?? null
    const norm = (v: string | null) => (v?.trim() === '' ? null : v?.trim() ?? null)
    if (norm(reference) !== norm(candidate)) {
      cellMismatches.push({ cell, reference: norm(reference), candidate: norm(candidate) })
    }
  }

  const vbaBytes = (filePath: string): number | null => {
    const zip = new AdmZip(filePath)
    const entry = zip.getEntry('xl/vbaProject.bin')
    return entry ? entry.header.size : null
  }
  const referenceVbaBytes = vbaBytes(referencePath)
  const candidateVbaBytes = vbaBytes(candidatePath)

  const refParts = listZipParts(referencePath)
  const candParts = listZipParts(candidatePath)
  const refMap = new Map(refParts.map((p) => [p.part, p.bytes]))
  const candMap = new Map(candParts.map((p) => [p.part, p.bytes]))

  const zipPartsOnlyInReference = [...refMap.keys()].filter((k) => !candMap.has(k))
  const zipPartsOnlyInCandidate = [...candMap.keys()].filter((k) => !refMap.has(k))

  const zipPartSizeDeltas: CompareReport['zipPartSizeDeltas'] = []
  for (const [part, referenceBytes] of refMap) {
    const candidateBytes = candMap.get(part)
    if (candidateBytes !== undefined && candidateBytes !== referenceBytes) {
      zipPartSizeDeltas.push({ part, referenceBytes, candidateBytes })
    }
  }

  return {
    reference: referencePath,
    candidate: candidatePath,
    cellMismatches,
    referenceVbaBytes,
    candidateVbaBytes,
    referencePrinterParts: refParts.filter((p) => p.part.startsWith('xl/printerSettings/')).length,
    candidatePrinterParts: candParts.filter((p) => p.part.startsWith('xl/printerSettings/')).length,
    zipPartsOnlyInReference,
    zipPartsOnlyInCandidate,
    zipPartSizeDeltas: zipPartSizeDeltas
      .sort(
        (a, b) =>
          Math.abs(b.candidateBytes - b.referenceBytes) -
          Math.abs(a.candidateBytes - a.referenceBytes),
      )
      .slice(0, 25),
  }
}

export function printCompareReport(label: string, report: CompareReport): void {
  console.log(`\n=== ${label} ===`)
  console.log(`VBA: ref ${report.referenceVbaBytes} bytes, cand ${report.candidateVbaBytes} bytes`)
  console.log(
    `Printer bins: ref ${report.referencePrinterParts}, cand ${report.candidatePrinterParts}`,
  )
  console.log(`Cell mismatches (tracked grid): ${report.cellMismatches.length}`)
  if (report.cellMismatches.length > 0) {
    for (const m of report.cellMismatches.slice(0, 20)) {
      console.log(`  ${m.cell}: ref="${m.reference}" cand="${m.candidate}"`)
    }
    if (report.cellMismatches.length > 20) {
      console.log(`  ... and ${report.cellMismatches.length - 20} more`)
    }
  }
  if (report.zipPartsOnlyInReference.length) {
    console.log(`Parts only in reference (${report.zipPartsOnlyInReference.length}):`)
    for (const p of report.zipPartsOnlyInReference.slice(0, 10)) console.log(`  - ${p}`)
  }
  if (report.zipPartsOnlyInCandidate.length) {
    console.log(`Parts only in candidate (${report.zipPartsOnlyInCandidate.length}):`)
    for (const p of report.zipPartsOnlyInCandidate.slice(0, 10)) console.log(`  - ${p}`)
  }
  console.log('Largest part size deltas:')
  for (const d of report.zipPartSizeDeltas.slice(0, 12)) {
    console.log(`  ${d.part}: ${d.referenceBytes} -> ${d.candidateBytes}`)
  }
}
