/**
 * Node-only legacy signature smoke test.
 * Run: bun run excel:signature-node
 */
import fs from 'node:fs'
import path from 'node:path'
import { generateTimesheetXlsm, listZipParts, templatePath } from '../../lib/timesheet-export/index.ts'
import { ensureTestSignaturePng } from './signature-fixture'
import { spikeOutDir } from './paths'

async function main() {
  const pngPath = ensureTestSignaturePng()
  const template = templatePath(false)
  if (!fs.existsSync(template)) {
    throw new Error(`Template not found: ${template}. Run bun run setup:legacy.`)
  }

  fs.mkdirSync(spikeOutDir, { recursive: true })
  const out = path.join(spikeOutDir, 'template-with-signature-node.xlsm')

  await generateTimesheetXlsm({
    outputPath: out,
    cells: {},
    staffSignaturePngPath: pngPath,
  })

  const refParts = listZipParts(template)
  const candParts = listZipParts(out)
  const refSet = new Set(refParts.map((p) => p.part))
  const newMedia = candParts.filter(
    (p) => p.part.startsWith('xl/media/') && !refSet.has(p.part),
  )

  console.log('\n--- Node legacy AddImage(36,1) ---')
  console.log(`  file: ${path.basename(out)}`)
  console.log(`  parts: ${candParts.length} (ref ${refParts.length})`)
  console.log(
    `  activeX: ${candParts.filter((p) => p.part.startsWith('xl/activeX/')).length} (ref ${refParts.filter((p) => p.part.startsWith('xl/activeX/')).length})`,
  )
  console.log(`  new media: ${newMedia.map((p) => p.part).join(', ') || '(none)'}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
