import fs from 'node:fs'
import path from 'node:path'
import { $ } from 'bun'
import type { CellSnapshot } from './types.ts'
import { assertTemplateExists, repoRoot } from './templates.ts'

const dotnetProject = path.join(
  repoRoot,
  'scripts',
  'excel-spike',
  'dotnet-export',
  'DotNetExport.csproj',
)

/** Reference implementation: legacy EPPlus `DotNetExport` spike. */
export async function generateTimesheetWithDotNet(
  cells: CellSnapshot,
  outputPath: string,
  casual: boolean,
  staffSignaturePngPath?: string,
  cellsJsonPath?: string,
): Promise<void> {
  if (casual) {
    throw new Error('DotNetExport spike only implements permanent staff (Worksheets[0]).')
  }
  if (!fs.existsSync(dotnetProject)) {
    throw new Error(`Missing ${dotnetProject}`)
  }

  const fixture =
    cellsJsonPath ??
    path.join(path.dirname(outputPath), `.${path.basename(outputPath)}.cells.json`)
  fs.mkdirSync(path.dirname(fixture), { recursive: true })
  fs.writeFileSync(fixture, JSON.stringify(cells, null, 2))

  const template = assertTemplateExists(false)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })

  const args = [fixture, outputPath, template]
  if (staffSignaturePngPath) args.push(staffSignaturePngPath)

  await $`dotnet run --project ${dotnetProject} -- ${args}`.cwd(path.dirname(dotnetProject))
}
