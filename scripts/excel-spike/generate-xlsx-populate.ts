import type { CellSnapshot } from './cell-refs'
import { generateTimesheetXlsm } from '../../lib/timesheet-export/generate.ts'

export async function generateWithXlsxPopulate(
  cells: CellSnapshot,
  outputPath: string,
  basePath: string,
  signaturePngPath?: string,
): Promise<void> {
  const casual = basePath.includes('template_casual')
  await generateTimesheetXlsm({
    outputPath,
    cells,
    casual,
    baseWorkbookPath: basePath,
    staffSignaturePngPath: signaturePngPath,
  })
}
