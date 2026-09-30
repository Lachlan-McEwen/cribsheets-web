import fs from 'node:fs'
import path from 'node:path'
import { $ } from 'bun'

const repoRoot = path.resolve(import.meta.dir, '../..')
export const dotnetProject = path.join(
  repoRoot,
  'scripts',
  'excel-spike',
  'dotnet-export',
  'DotNetExport.csproj',
)

/** Same as legacy SpreadSheetUpdater: copy base xlsm, fill cells, optional AddImage(36,1). */
export async function runDotNetExport(
  cellsJsonPath: string,
  outputPath: string,
  baseXlsmPath: string,
  signaturePngPath?: string,
): Promise<void> {
  if (!fs.existsSync(dotnetProject)) {
    throw new Error(`Missing ${dotnetProject}`)
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })

  const args = [cellsJsonPath, outputPath, baseXlsmPath]
  if (signaturePngPath) args.push(signaturePngPath)

  await $`dotnet run --project ${dotnetProject} -- ${args}`.cwd(path.dirname(dotnetProject))
}
