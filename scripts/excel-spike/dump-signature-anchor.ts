import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { prodExamplePath, spikeOutDir, templatePath } from './paths'

const EMU_PER_PX = 9525

function dump(file: string) {
  const z = new AdmZip(file)
  const d1 = z.getEntry('xl/drawings/drawing1.xml')?.getData().toString('utf8') ?? ''
  const rels = z.getEntry('xl/drawings/_rels/drawing1.xml.rels')?.getData().toString('utf8') ?? ''
  const png = z.getEntry('xl/media/image1.Png')

  console.log(`\n======== ${path.basename(file)} ========`)
  console.log('image1.Png bytes:', png?.header.size ?? 'missing')

  const blocks = d1.split('<xdr:twoCellAnchor').slice(1)
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const embed = b.match(/r:embed="([^"]+)"/)?.[1]
    let target = ''
    if (embed) {
      const m = rels.match(new RegExp(`Id="${embed}"[^>]+Target="([^"]+)"`))
      target = m?.[1] ?? ''
    }
    if (!target.includes('image1') && !b.includes('<xdr:pic')) continue
    if (!target.includes('image1') && b.includes('<xdr:pic')) {
      // pic without embed in snippet
    }

    const name = b.match(/name="([^"]+)"/)?.[1]
    const fromCol = b.match(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/)?.[1]
    const fromRow = b.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/)?.[1]
    const fromColOff = b.match(/<xdr:from>[\s\S]*?<xdr:colOff>(\d+)<\/xdr:colOff>/)?.[1]
    const fromRowOff = b.match(/<xdr:from>[\s\S]*?<xdr:rowOff>(\d+)<\/xdr:rowOff>/)?.[1]
    const toCol = b.match(/<xdr:to>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/)?.[1]
    const toRow = b.match(/<xdr:to>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/)?.[1]
    const cx = b.match(/<a:ext cx="(\d+)" cy="(\d+)"/)
    const editAs = b.match(/twoCellAnchor([^>]*)/)?.[1] ?? ''

    console.log(`  anchor[${i}] name=${name} target=${target} editAs${editAs}`)
    console.log(
      `    from col=${fromCol} row=${fromRow} off col=${fromColOff} row=${fromRowOff}`,
    )
    console.log(`    to   col=${toCol} row=${toRow}`)
    if (cx) {
      const wPx = Math.round(Number(cx[1]) / EMU_PER_PX)
      const hPx = Math.round(Number(cx[2]) / EMU_PER_PX)
      console.log(`    ext ${wPx}x${hPx} px (${cx[1]} x ${cx[2]} EMU)`)
    }
  }

  // EPPlus may add separate drawing - list all drawings on sheet1
  const s1rels = z.getEntry('xl/worksheets/_rels/sheet1.xml.rels')?.getData().toString('utf8') ?? ''
  console.log('sheet1 drawing rels:', s1rels.replace(/\s+/g, ' ').slice(0, 200))
}

const files = [
  prodExamplePath,
  path.join(spikeOutDir, 'template-with-signature-surgical-v2.xlsm'),
  path.join(spikeOutDir, 'template-with-signature-dotnet.xlsm'),
  templatePath,
]

for (const f of files) {
  if (fs.existsSync(f)) dump(f)
}

console.log('\nNote: Excel rows/cols in XML are 0-based. Row 8 = Excel row 9. Col 18 = column S.')
