import fs from 'node:fs'
import AdmZip from 'adm-zip'

const file = process.argv[2]
const pattern = process.argv[3] ?? 'Signature'
if (!file) {
  console.error('Usage: bun grep-xlsm.ts <file.xlsm> [pattern]')
  process.exit(1)
}
const z = new AdmZip(file)
const re = new RegExp(pattern, 'i')
for (const e of z.getEntries()) {
  if (!/\.(xml|vml|rels)$/i.test(e.entryName) && !e.entryName.includes('drawing')) continue
  const t = e.getData().toString('utf8')
  if (re.test(t)) {
    console.log(e.entryName)
    for (const line of t.split('\n')) {
      if (re.test(line)) console.log(' ', line.trim().slice(0, 200))
    }
  }
}
