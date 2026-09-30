import fs from 'node:fs'
import AdmZip from 'adm-zip'

const STRIP_PREFIXES = ['xl/printerSettings/']
const STRIP_EXACT = ['xl/calcChain.xml']

export function patchOutputFromReference(referencePath: string, outputPath: string): void {
  const reference = new AdmZip(referencePath)
  const output = new AdmZip(outputPath)

  const referenceEntries = new Map(
    reference.getEntries().map((e) => [normalizeEntry(e.entryName), e]),
  )

  for (const prefix of ['customXml/', 'docMetadata/']) {
    for (const entry of [...output.getEntries()]) {
      const name = normalizeEntry(entry.entryName)
      if (name.startsWith(prefix)) output.deleteFile(entry)
    }
    for (const [name, entry] of referenceEntries) {
      if (name.startsWith(prefix)) output.addFile(name, entry.getData())
    }
  }

  for (const prefix of STRIP_PREFIXES) {
    for (const entry of output.getEntries()) {
      if (normalizeEntry(entry.entryName).startsWith(prefix)) output.deleteFile(entry)
    }
  }

  for (const exact of STRIP_EXACT) {
    const hit = output.getEntry(exact)
    if (hit) output.deleteFile(hit)
  }

  fixWorkbookRels(output)
  fs.writeFileSync(outputPath, output.toBuffer())
}

function normalizeEntry(name: string): string {
  return name.replace(/\\/g, '/')
}

function fixWorkbookRels(zip: AdmZip): void {
  const relsPath = 'xl/_rels/workbook.xml.rels'
  const entry = zip.getEntry(relsPath)
  if (!entry) return
  let xml = entry.getData().toString('utf8')
  xml = xml.replace(/<Relationship[^>]*Type="[^"]*calcChain[^"]*"[^>]*\/>/gi, '')
  zip.updateFile(relsPath, Buffer.from(xml, 'utf8'))
}
