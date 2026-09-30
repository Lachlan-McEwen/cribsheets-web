import fs from 'node:fs'
import path from 'node:path'
import { $ } from 'bun'
import { prodExamplePath, spikeOutDir } from './paths'

const repoRoot = path.resolve(import.meta.dir, '../..')
const dotnetProject = path.join(
  repoRoot,
  'scripts',
  'excel-spike',
  'dotnet-export',
  'DotNetExport.csproj',
)

export async function generateWithDotNet(outputPath: string): Promise<void> {
  if (!fs.existsSync(dotnetProject)) {
    throw new Error(`Missing ${dotnetProject}`)
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })

  const fixture = path.join(spikeOutDir, 'cassie-from-prod.cells.json')
  await $`dotnet run --project ${dotnetProject} -- ${fixture} ${outputPath} ${prodExamplePath}`.cwd(
    path.dirname(dotnetProject),
  )
}
