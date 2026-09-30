import AdmZip from 'adm-zip'
import { Workbook } from '@sheetkit/node'
import { allTrackedCellRefs, type CellSnapshot } from './cells.ts'
import { dataSheetName } from './templates.ts'

export type ZipPartSummary = { part: string; bytes: number }

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

async function readTrackedCells(filePath: string, casual: boolean): Promise<CellSnapshot> {
  const wb = await Workbook.open(filePath, { readMode: 'eager', auxParts: 'eager' })
  const sheet = dataSheetName(casual)
  const out: CellSnapshot = {}
  for (const cell of allTrackedCellRefs()) {
    out[cell] = wb.getCellFormattedValue(sheet, cell) || null
  }
  return out
}

export type CompareReport = {
  reference: string
  candidate: string
  cellMismatches: { cell: string; reference: string | null; candidate: string | null }[]
  referenceVbaBytes: number | null
  candidateVbaBytes: number | null
  zipPartsOnlyInReference: string[]
  zipPartsOnlyInCandidate: string[]
}

function vbaBytes(filePath: string): number | null {
  const entry = new AdmZip(filePath).getEntry('xl/vbaProject.bin')
  return entry ? entry.header.size : null
}

/** Align SheetKit reads of EPPlus vs xlsx-populate (escaped `_x000D_` vs real CR). */
export function normalizeCellDisplay(v: string | null): string | null {
  if (v === null || v === undefined) return null
  let s = v.trim()
  if (s === '') return null
  s = s.replace(/_x005F_x000D_/gi, '\n').replace(/_x000D_/gi, '\n')
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  s = s.replace(/\n{3,}/g, '\n\n')
  return s
}

const norm = (v: string | null) => normalizeCellDisplay(v)

export async function compareTrackedCells(
  referencePath: string,
  candidatePath: string,
  casual = false,
): Promise<CompareReport> {
  const [refCells, candCells] = await Promise.all([
    readTrackedCells(referencePath, casual),
    readTrackedCells(candidatePath, casual),
  ])

  const cellMismatches: CompareReport['cellMismatches'] = []
  for (const cell of allTrackedCellRefs()) {
    const reference = norm(refCells[cell] ?? null)
    const candidate = norm(candCells[cell] ?? null)
    if (reference !== candidate) {
      cellMismatches.push({ cell, reference, candidate })
    }
  }

  const refParts = new Set(listZipParts(referencePath).map((p) => p.part))
  const candParts = listZipParts(candidatePath)

  return {
    reference: referencePath,
    candidate: candidatePath,
    cellMismatches,
    referenceVbaBytes: vbaBytes(referencePath),
    candidateVbaBytes: vbaBytes(candidatePath),
    zipPartsOnlyInReference: [...refParts].filter(
      (k) => !candParts.some((c) => c.part === k),
    ),
    zipPartsOnlyInCandidate: candParts.filter((p) => !refParts.has(p.part)).map((p) => p.part),
  }
}

const PRESERVATION_OPTIONAL_PREFIXES = ['xl/printerSettings/', 'docMetadata/']
const PRESERVATION_OPTIONAL_EXACT = new Set(['xl/calcChain.xml'])

export function preservationScore(templatePath: string, candidatePath: string): {
  templateParts: number
  candidateParts: number
  missingCriticalParts: string[]
  activeXTemplate: number
  activeXCandidate: number
  vbaSizeMatch: boolean
} {
  const ref = listZipParts(templatePath)
  const cand = listZipParts(candidatePath)
  const candSet = new Set(cand.map((p) => p.part))
  const missingCriticalParts = ref
    .map((p) => p.part)
    .filter(
      (part) =>
        !candSet.has(part) &&
        !PRESERVATION_OPTIONAL_EXACT.has(part) &&
        !PRESERVATION_OPTIONAL_PREFIXES.some((prefix) => part.startsWith(prefix)),
    )

  return {
    templateParts: ref.length,
    candidateParts: cand.length,
    missingCriticalParts,
    activeXTemplate: ref.filter((p) => p.part.startsWith('xl/activeX/')).length,
    activeXCandidate: cand.filter((p) => p.part.startsWith('xl/activeX/')).length,
    vbaSizeMatch:
      (ref.find((p) => p.part === 'xl/vbaProject.bin')?.bytes ?? 0) ===
      (cand.find((p) => p.part === 'xl/vbaProject.bin')?.bytes ?? 0),
  }
}
