import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { prodExamplePath, spikeOutDir, templatePath } from './paths'

const files: Record<string, string> = {
  surgical: path.join(spikeOutDir, 'template-with-signature-surgical.xlsm'),
  dotnet: path.join(spikeOutDir, 'template-with-signature-dotnet.xlsm'),
  template: templatePath,
  prod: prodExamplePath,
}

function analyze(label: string, file: string) {
  if (!fs.existsSync(file)) {
    console.log(label, 'missing')
    return
  }
  const z = new AdmZip(file)
  const d1 = z.getEntry('xl/drawings/drawing1.xml')?.getData().toString('utf8') ?? ''
  const rels = z.getEntry('xl/drawings/_rels/drawing1.xml.rels')?.getData().toString('utf8') ?? ''
  const png = z.getEntry('xl/media/image1.Png') ?? z.getEntry('xl/media/image1.png')
  console.log(`=== ${label} ===`)
  console.log('image1.Png bytes:', png?.header.size ?? 'missing')

  const blocks = d1.split('<xdr:twoCellAnchor').slice(1)
  console.log('anchors:', blocks.length)
  for (let i = 0; i < Math.min(blocks.length, 8); i++) {
    const block = blocks[i]
    const fromCol = block.match(/<xdr:col>(\d+)<\/xdr:col>/)?.[1]
    const fromRow = block.match(/<xdr:row>(\d+)<\/xdr:row>/)?.[1]
    const embed = block.match(/r:embed="([^"]+)"/)?.[1]
    let target = ''
    if (embed) {
      const m = rels.match(new RegExp(`Id="${embed}"[^>]+Target="([^"]+)"`))
      target = m?.[1] ?? ''
    }
    const isPic = block.includes('<xdr:pic')
    const name = block.match(/name="([^"]+)"/)?.[1]
    console.log(
      `  ${i} ${isPic ? 'PIC' : 'shape'} col=${fromCol} row=${fromRow} name=${name ?? '?'} -> ${target || embed || '?'}`,
    )
  }
}

for (const [k, v] of Object.entries(files)) analyze(k, v)

const pngPath = path.join(import.meta.dir, 'fixtures', 'test-signature.png')
const buf = fs.readFileSync(pngPath)
console.log('\nfixture PNG:', buf.length, 'bytes', buf.readUInt32BE(16), 'x', buf.readUInt32BE(20))
