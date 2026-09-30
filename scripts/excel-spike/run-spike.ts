import fs from 'node:fs'
import path from 'node:path'
import { extractCellsFromWorkbook } from './extract-cells'
import { generateFromTemplateDotNet } from './generate-from-template'
import { generateWithDotNet } from './generate-dotnet'
import { generateWithSheetJS } from './generate-sheetjs'
import { generateWithXlsxPopulate } from './generate-xlsx-populate'
import { compareWorkbooks, printCompareReport } from './compare-xlsm'
import { patchOutputFromReference } from './patch-from-template'
import { ensureTestSignaturePng } from './signature-fixture'
import { prodExamplePath, spikeOutDir, templatePath } from './paths'

async function main() {
  if (!fs.existsSync(prodExamplePath)) {
    throw new Error(`Prod example not found: ${prodExamplePath}`)
  }

  console.log('Extracting cell snapshot from prod example...')
  const cells = await extractCellsFromWorkbook(prodExamplePath)
  const fixturePath = path.join(spikeOutDir, 'cassie-from-prod.cells.json')
  fs.mkdirSync(spikeOutDir, { recursive: true })
  fs.writeFileSync(fixturePath, JSON.stringify(cells, null, 2))
  console.log(`Wrote ${Object.keys(cells).length} cells -> ${fixturePath}`)

  const populateOut = path.join(spikeOutDir, 'cassie-xlsx-populate-roundtrip.xlsm')
  const sheetJsProdOut = path.join(spikeOutDir, 'cassie-sheetjs-roundtrip.xlsm')
  const sheetJsTemplateOut = path.join(spikeOutDir, 'cassie-sheetjs-from-template.xlsm')
  const dotnetOut = path.join(spikeOutDir, 'cassie-dotnet-roundtrip.xlsm')
  const templateOut = path.join(spikeOutDir, 'cassie-from-template-dotnet.xlsm')
  const templateNodeOut = path.join(spikeOutDir, 'cassie-from-template-node.xlsm')
  const signaturePng = ensureTestSignaturePng()

  console.log('\nRound-trip test: copy prod base, rewrite same cells (.NET EPPlus)...')
  await generateWithDotNet(dotnetOut)

  console.log('Round-trip test: copy prod base (xlsx-populate)...')
  await generateWithXlsxPopulate(cells, populateOut, prodExamplePath)

  console.log('Round-trip test: copy prod base (SheetJS CE, bookVBA)...')
  const sheetJsProdMeta = await generateWithSheetJS(cells, sheetJsProdOut, prodExamplePath)
  console.log(`  vbaraw on read: ${sheetJsProdMeta.hadVbaOnRead}`)

  console.log('Production path: template.xlsm + cells (SheetJS CE)...')
  const sheetJsTemplateMeta = await generateWithSheetJS(cells, sheetJsTemplateOut, templatePath)
  console.log(`  vbaraw on read: ${sheetJsTemplateMeta.hadVbaOnRead}`)

  console.log('Production path: template.xlsm + cells + signature (.NET EPPlus)...')
  await generateFromTemplateDotNet(cells, templateOut, signaturePng)

  console.log('Production path: template.xlsm + cells + signature (xlsx-populate + Node OOXML)...')
  await generateWithXlsxPopulate(cells, templateNodeOut, templatePath, signaturePng)

  console.log('Patching (customXml/docMetadata + strip calcChain/printerSettings)...')
  for (const out of [
    dotnetOut,
    populateOut,
    templateOut,
    templateNodeOut,
    sheetJsProdOut,
    sheetJsTemplateOut,
  ]) {
    patchOutputFromReference(prodExamplePath, out)
  }

  const dotnetReport = await compareWorkbooks(prodExamplePath, dotnetOut)
  printCompareReport('.NET EPPlus round-trip vs prod', dotnetReport)

  const populateReport = await compareWorkbooks(prodExamplePath, populateOut)
  printCompareReport('xlsx-populate round-trip vs prod', populateReport)

  const sheetJsProdReport = await compareWorkbooks(prodExamplePath, sheetJsProdOut)
  printCompareReport('SheetJS round-trip vs prod', sheetJsProdReport)

  const sheetJsTemplateReport = await compareWorkbooks(prodExamplePath, sheetJsTemplateOut)
  printCompareReport('SheetJS from template vs prod', sheetJsTemplateReport)

  const templateReport = await compareWorkbooks(prodExamplePath, templateOut)
  printCompareReport('.NET from template vs prod', templateReport)

  const templateNodeReport = await compareWorkbooks(prodExamplePath, templateNodeOut)
  printCompareReport('Node (populate + signature) from template vs prod', templateNodeReport)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
