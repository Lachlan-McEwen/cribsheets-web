/**
 * OOXML preservation audit: compare spike outputs to prod reference.
 * Run: bun scripts/excel-spike/inspect-preservation.ts
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { listZipParts } from './compare-xlsm'
import { prodExamplePath, spikeOutDir } from './paths'

type Category = 'activeX' | 'ctrlProps' | 'drawings' | 'vml' | 'media' | 'vba' | 'other'

function categorize(part: string): Category {
  const p = part.replace(/\\/g, '/')
  if (p.startsWith('xl/activeX/')) return 'activeX'
  if (p.startsWith('xl/ctrlProps/')) return 'ctrlProps'
  if (p.startsWith('xl/drawings/')) return 'drawings'
  if (p.includes('vmlDrawing')) return 'vml'
  if (p.startsWith('xl/media/')) return 'media'
  if (p === 'xl/vbaProject.bin') return 'vba'
  return 'other'
}

function sha256(zip: AdmZip, part: string): string | null {
  const entry = zip.getEntry(part)
  if (!entry) return null
  return crypto.createHash('sha256').update(entry.getData()).digest('hex').slice(0, 16)
}

function sheet1Markers(zip: AdmZip): {
  hasLegacyDrawing: boolean
  hasControls: boolean
  hasDrawing: boolean
  formulaCount: number
} {
  const entry = zip.getEntry('xl/worksheets/sheet1.xml')
  if (!entry) {
    return { hasLegacyDrawing: false, hasControls: false, hasDrawing: false, formulaCount: 0 }
  }
  const xml = entry.getData().toString('utf8')
  return {
    hasLegacyDrawing: /legacyDrawing/.test(xml),
    hasControls: /<controls>/.test(xml),
    hasDrawing: /drawing r:id=/.test(xml),
    formulaCount: (xml.match(/<f[^>]*>/g) ?? []).length,
  }
}

function countByCategory(parts: { part: string; bytes: number }[]): Record<Category, number> {
  const out: Record<Category, number> = {
    activeX: 0,
    ctrlProps: 0,
    drawings: 0,
    vml: 0,
    media: 0,
    vba: 0,
    other: 0,
  }
  for (const { part, bytes } of parts) {
    out[categorize(part)] += bytes
  }
  return out
}

function audit(label: string, filePath: string, refMap: Map<string, number>, refVbaHash: string | null) {
  if (!fs.existsSync(filePath)) {
    return { label, missing: true as const }
  }

  const zip = new AdmZip(filePath)
  const parts = listZipParts(filePath)
  const partSet = new Set(parts.map((p) => p.part))
  const catBytes = countByCategory(parts)
  const styles = parts.find((p) => p.part === 'xl/styles.xml')?.bytes ?? 0
  const sheet1 = sheet1Markers(zip)
  const vbaHash = sha256(zip, 'xl/vbaProject.bin')
  const vbaBytes = parts.find((p) => p.part === 'xl/vbaProject.bin')?.bytes ?? 0

  const missingFromRef = [...refMap.keys()].filter((k) => !partSet.has(k))
  const missingActiveX = missingFromRef.filter((p) => p.startsWith('xl/activeX/'))
  const missingCtrl = missingFromRef.filter((p) => p.startsWith('xl/ctrlProps/'))
  const missingDrawings = missingFromRef.filter((p) => p.startsWith('xl/drawings/'))
  const missingMedia = missingFromRef.filter((p) => p.startsWith('xl/media/'))

  const vbaIdenticalToRef = refVbaHash !== null && vbaHash === refVbaHash

  return {
    label,
    missing: false as const,
    file: path.basename(filePath),
    totalParts: parts.length,
    stylesBytes: styles,
    vbaBytes,
    vbaHash,
    vbaIdenticalToRef,
    categoryBytes: catBytes,
    sheet1,
    missingActiveXCount: missingActiveX.length,
    missingCtrlCount: missingCtrl.length,
    missingDrawingsCount: missingDrawings.length,
    missingMediaCount: missingMedia.length,
    missingActiveX,
    missingCtrl,
    missingDrawings: missingDrawings.slice(0, 8),
    extraParts: [...partSet].filter((k) => !refMap.has(k)),
  }
}

function main() {
  const refPath = prodExamplePath
  const refParts = listZipParts(refPath)
  const refMap = new Map(refParts.map((p) => [p.part, p.bytes]))
  const refZip = new AdmZip(refPath)
  const refVbaHash = sha256(refZip, 'xl/vbaProject.bin')
  const refSheet1 = sheet1Markers(refZip)
  const refStyles = refParts.find((p) => p.part === 'xl/styles.xml')?.bytes ?? 0

  const candidates = [
    { label: 'SheetJS prod round-trip', file: 'cassie-sheetjs-roundtrip.xlsm' },
    { label: 'SheetJS from template', file: 'cassie-sheetjs-from-template.xlsm' },
    { label: 'xlsx-populate round-trip', file: 'cassie-xlsx-populate-roundtrip.xlsm' },
    { label: '.NET EPPlus round-trip', file: 'cassie-dotnet-roundtrip.xlsm' },
    { label: 'ExcelJS (old spike)', file: 'cassie-exceljs.xlsm' },
  ]

  console.log('=== Reference (prod CASSIE example) ===')
  console.log(`  Parts: ${refParts.length}, styles.xml: ${refStyles} bytes`)
  console.log(`  vbaProject.bin: ${refParts.find((p) => p.part === 'xl/vbaProject.bin')?.bytes} bytes, sha256[0:16]=${refVbaHash}`)
  console.log(`  Timesheet sheet1: legacyDrawing=${refSheet1.hasLegacyDrawing} controls=${refSheet1.hasControls} drawing=${refSheet1.hasDrawing} formulas≈${refSheet1.formulaCount}`)
  console.log(`  Category bytes:`, countByCategory(refParts))

  const results = candidates.map((c) =>
    audit(c.label, path.join(spikeOutDir, c.file), refMap, refVbaHash),
  )

  console.log('\n=== Preservation verdict (vs prod package) ===\n')

  for (const r of results) {
    if (r.missing) {
      console.log(`[SKIP] ${r.label}: file not found`)
      continue
    }

    const failActiveX = r.missingActiveXCount > 0
    const failCtrl = r.missingCtrlCount > 0
    const stylesGutted = r.stylesBytes < refStyles * 0.1
    const sheet1Stripped = refSheet1.hasControls && !r.sheet1.hasControls
    const drawingsGone = r.missingDrawingsCount > 5

    const passExport =
      !failActiveX && !failCtrl && !stylesGutted && !sheet1Stripped && !drawingsGone

    console.log(`--- ${r.label} (${r.file}) ---`)
    console.log(`  Export-safe (authoriser parity): ${passExport ? 'LIKELY YES' : 'NO'}`)
    if (!passExport) {
      const reasons: string[] = []
      if (failActiveX) reasons.push(`missing ${r.missingActiveXCount} activeX parts`)
      if (failCtrl) reasons.push(`missing ${r.missingCtrlCount} ctrlProps parts`)
      if (stylesGutted) reasons.push(`styles.xml ${r.stylesBytes}B (ref ${refStyles}B)`)
      if (sheet1Stripped) reasons.push('Timesheet sheet1 <controls> removed')
      if (drawingsGone) reasons.push(`missing ${r.missingDrawingsCount} drawing-related parts`)
      console.log(`  Reasons: ${reasons.join('; ')}`)
    }
    console.log(
      `  VBA: ${r.vbaBytes}B, hash match ref: ${r.vbaIdenticalToRef} (bookVBA alone is not enough)`,
    )
    console.log(
      `  sheet1 markers: legacyDrawing=${r.sheet1.hasLegacyDrawing} controls=${r.sheet1.hasControls} formulas≈${r.sheet1.formulaCount}`,
    )
    console.log(
      `  Package: ${r.totalParts} parts (ref ${refParts.length}), media missing: ${r.missingMediaCount}, extra: ${r.extraParts.join(', ') || 'none'}`,
    )
    if (failActiveX && r.missingActiveX.length) {
      console.log(`  ActiveX removed e.g. ${r.missingActiveX.slice(0, 3).join(', ')}`)
    }
    console.log('')
  }

  const reportPath = path.join(spikeOutDir, 'preservation-audit.json')
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ reference: refPath, refSheet1, refStyles, refVbaHash, results }, null, 2),
  )
  console.log(`Wrote ${reportPath}`)
}

main()
