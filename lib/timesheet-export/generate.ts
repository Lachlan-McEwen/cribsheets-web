import { fillWorkbookFromSnapshot } from './fill-workbook.ts'
import { patchOutputFromReference } from './patch-package.ts'
import { addLegacyStaffSignature } from './signature.ts'
import { assertTemplateExists } from './templates.ts'
import type { GenerateTimesheetOptions } from './types.ts'

/**
 * Node port of legacy `WriteSpreadSheet`: copy template, fill cells, optional staff PNG.
 */
export async function generateTimesheetXlsm(options: GenerateTimesheetOptions): Promise<void> {
  const casual = options.casual ?? false
  const baseWorkbook = options.baseWorkbookPath ?? assertTemplateExists(casual)

  if (casual && options.staffSignaturePngPath) {
    throw new Error('Casual staff signature embedding is not implemented yet (drawing sheet differs).')
  }

  await fillWorkbookFromSnapshot(
    baseWorkbook,
    options.outputPath,
    options.cells,
    casual,
    options.cellFonts ?? {},
  )

  if (options.staffSignaturePngPath) {
    addLegacyStaffSignature(options.outputPath, options.staffSignaturePngPath)
  }

  if (options.patchPackageFromReference) {
    patchOutputFromReference(options.patchPackageFromReference, options.outputPath)
  }
}
