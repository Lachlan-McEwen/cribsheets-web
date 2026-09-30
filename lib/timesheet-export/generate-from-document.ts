import { generateTimesheetXlsm } from './generate.ts'
import { timesheetDocumentToCellWrites } from './timesheet-to-cells.ts'
import type { TimesheetDocument } from './legacy-types.ts'
import type { GenerateTimesheetOptions } from './types.ts'

export type GenerateFromDocumentOptions = Omit<
  GenerateTimesheetOptions,
  'cells' | 'cellFonts' | 'casual'
> & {
  timesheet: TimesheetDocument
}

/** `TimesheetDocument` → legacy cell map → `.xlsm` (same path as legacy generate). */
export async function generateTimesheetFromDocument(
  options: GenerateFromDocumentOptions,
): Promise<void> {
  const casual = options.timesheet.user.casual ?? false
  const { cells, cellFonts } = timesheetDocumentToCellWrites(options.timesheet)

  await generateTimesheetXlsm({
    outputPath: options.outputPath,
    cells,
    cellFonts,
    casual,
    baseWorkbookPath: options.baseWorkbookPath,
    staffSignaturePngPath: options.staffSignaturePngPath,
    patchPackageFromReference: options.patchPackageFromReference,
  })
}
