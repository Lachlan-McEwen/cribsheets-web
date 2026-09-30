/**
 * Compare staff signature packaging: spike outputs vs prod CASSIE.
 * Run: bun scripts/excel-spike/compare-signature-to-prod.ts
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { prodExamplePath, spikeOutDir } from './paths'

const candidates = [
  'template-with-signature-surgical-v2.xlsm',
  'template-with-signature-surgical.xlsm',
  'template-with-signature-dotnet.xlsm',
].map((f) => path.join(spikeOutDir, f))

function hash(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16)
}

function signaturePicAnchor(drawing1: string): string | null {
  const blocks = drawing1.split('<xdr:twoCellAnchor').slice(1)
  for (const block of blocks) {
    if (!block.includes('<xdr:pic') || !block.includes('image1.Png')) continue
    if (!block.includes('r:embed') && !block.includes('image1')) {
      // resolve via rel id in block
    }
    const fromCol = block.match(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/)?.[1]
    const fromRow = block.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/)?.[1]
    const toCol = block.match(/<xdr:to>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/)?.[1]
    const toRow = block.match(/<xdr:to>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/)?.[1]
    const ext = block.match(/<a:ext cx="(\d+)" cy="(\d+)"/)
    const name = block.match(/name="([^"]+)"/)?.[1]
    return `name=${name} from col=${fromCol} row=${fromRow} to col=${toCol} row=${toRow} ext=${ext?.[1]}x${ext?.[2]} EMU`
  }
  // anchor 7 uses rId4 -> image1.Png in prod rels
  for (const block of blocks) {
    if (!block.includes('<xdr:pic')) continue
    const embed = block.match(/r:embed="([^"]+)"/)?.[1]
    const fromCol = block.match(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/)?.[1]
    const fromRow = block.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/)?.[1]
    const name = block.match(/name="([^"]+)"/)?.[1]
    if (embed === 'rId4' || name?.includes('193')) {
      return `STAFF SIG? name=${name} embed=${embed} from col=${fromCol} row=${fromRow} (Excel ~col ${letter(Number(fromCol))} row ${Number(fromRow) + 1})`
    }
  }
  return null
}

function letter(col0: number): string {
  let n = col0
  let s = ''
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

function analyze(file: string, prodPngHash: string, prodDrawingHash: string) {
  if (!fs.existsSync(file)) return
  const z = new AdmZip(file)
  const png = z.getEntry('xl/media/image1.Png')
  const d1 = z.getEntry('xl/drawings/drawing1.xml')
  const d1rels = z.getEntry('xl/drawings/_rels/drawing1.xml.rels')
  const pngHash = png ? hash(png.getData()) : null
  const dHash = d1 ? hash(d1.getData()) : null
  const drHash = d1rels ? hash(d1rels.getData()) : null

  console.log(`\n${path.basename(file)}`)
  console.log(`  image1.Png: ${png?.header.size ?? 'MISSING'} B, hash match prod: ${pngHash === prodPngHash}`)
  console.log(`  drawing1.xml hash match prod: ${dHash === prodDrawingHash}`)
  console.log(`  drawing1.xml.rels hash match prod: ${drHash === prodDrawingHash}`)
  if (d1) console.log(`  anchor: ${signaturePicAnchor(d1.getData().toString('utf8'))}`)
}

const prod = new AdmZip(prodExamplePath)
const prodPng = prod.getEntry('xl/media/image1.Png')!
const prodD1 = prod.getEntry('xl/drawings/drawing1.xml')!
const prodRels = prod.getEntry('xl/drawings/_rels/drawing1.xml.rels')!
const prodPngHash = hash(prodPng.getData())
const prodD1Hash = hash(prodD1.getData())
const prodRelsHash = hash(prodRels.getData())

console.log('=== PROD (CASSIE) reference ===')
console.log(`  image1.Png: ${prodPng.header.size} B`)
console.log(`  anchor: ${signaturePicAnchor(prodD1.getData().toString('utf8'))}`)
console.log('  (Staff sig is NOT row 36 — it is anchored ~col S row 9 on Timesheet)')

for (const f of candidates) analyze(f, prodPngHash, prodD1Hash)
console.log('\nInterpretation: surgical v2 should match prod drawing + PNG bytes to look like prod.')
console.log('Old surgical/dotnet with 283B PNG = nearly invisible placeholder, not prod signature.')
