import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { spikeOutDir } from './paths'

function extractSignatureAnchor(file: string): string | null {
  if (!fs.existsSync(file)) return null
  const d = new AdmZip(file).getEntry('xl/drawings/drawing1.xml')!.getData().toString('utf8')
  const idx = d.indexOf('name="Signature"')
  if (idx < 0) return null
  const start = d.lastIndexOf('<xdr:oneCellAnchor', idx)
  const end = d.indexOf('</xdr:oneCellAnchor>', idx) + '</xdr:oneCellAnchor>'.length
  return d.slice(start, end)
}

const dotnet = path.join(spikeOutDir, 'template-with-signature-dotnet.xlsm')
const node = path.join(spikeOutDir, 'template-with-signature-node.xlsm')

const a = extractSignatureAnchor(dotnet)
const b = extractSignatureAnchor(node)
console.log('dotnet anchor:', a?.replace(/\s+/g, ' ').slice(0, 120), '...')
console.log('node anchor:  ', b?.replace(/\s+/g, ' ').slice(0, 120), '...')
console.log('anchors match (ignoring cNv id):', a?.replace(/\bid="\d+"/, '') === b?.replace(/\bid="\d+"/, ''))
