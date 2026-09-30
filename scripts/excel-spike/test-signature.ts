import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { $ } from 'bun'
import { listZipParts } from './compare-xlsm'
import { prodExamplePath, spikeOutDir, templatePath } from './paths'

const repoRoot = path.resolve(import.meta.dir, '../..')
const dotnetProject = path.join(repoRoot, 'scripts', 'excel-spike', 'dotnet-export', 'DotNetExport.csproj')
const fixturesDir = path.join(import.meta.dir, 'fixtures')
const cellsPath = path.join(fixturesDir, 'empty-cells.json')
const pngPath = path.join(fixturesDir, 'test-signature.png')
const outputPath = path.join(spikeOutDir, 'template-with-signature-dotnet.xlsm')

function ensureTestPng(): void {
  fs.mkdirSync(fixturesDir, { recursive: true })
  if (fs.existsSync(pngPath) && fs.statSync(pngPath).size > 1000) return
  if (fs.existsSync(prodExamplePath)) {
    const prod = new AdmZip(prodExamplePath)
    const entry = prod.getEntry('xl/media/image1.Png')
    if (entry) {
      fs.writeFileSync(pngPath, entry.getData())
      return
    }
  }
  if (!fs.existsSync(pngPath)) throw new Error('Need fixtures/test-signature.png or prod example')
}

async function main() {
  ensureTestPng()
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}. Run bun run setup:legacy.`)
  }

  fs.mkdirSync(spikeOutDir, { recursive: true })
  await $`dotnet run --project ${dotnetProject} -- ${cellsPath} ${outputPath} ${templatePath} ${pngPath}`.cwd(
    path.dirname(dotnetProject),
  )

  const refParts = listZipParts(templatePath)
  const outParts = listZipParts(outputPath)
  const refMedia = refParts.filter((p) => p.part.startsWith('xl/media/'))
  const outMedia = outParts.filter((p) => p.part.startsWith('xl/media/'))
  const newMedia = outMedia.filter((p) => !refParts.some((r) => r.part === p.part))

  console.log('\n=== Signature spike (template + PNG via EPPlus AddPicture) ===')
  console.log(`Output: ${outputPath}`)
  console.log(`Template media parts: ${refMedia.length}, output: ${outMedia.length}`)
  console.log(`New media parts: ${newMedia.map((p) => p.part).join(', ') || '(none)'}`)
  console.log('Open in Excel and confirm staff signature area on Timesheet (~row 36).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
