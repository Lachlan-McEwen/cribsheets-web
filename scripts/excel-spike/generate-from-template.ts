import type { CellSnapshot } from './cell-refs'
import { generateTimesheetWithDotNet } from '../../lib/timesheet-export/dotnet-generate.ts'
import { spikeOutDir } from './paths'
import path from 'node:path'

export async function generateFromTemplateDotNet(
  cells: CellSnapshot,
  outputPath: string,
  staffSignaturePngPath?: string,
): Promise<void> {
  const fixturePath = path.join(spikeOutDir, 'cassie-from-prod.cells.json')
  await generateTimesheetWithDotNet(cells, outputPath, false, staffSignaturePngPath, fixturePath)
}
