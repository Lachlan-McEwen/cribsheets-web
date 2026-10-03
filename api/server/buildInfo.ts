import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BUILD_INFO_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'build-info.json')

export type BuildInfo = {
  version: string
  commit: string | null
  builtAt: string | null
}

let cached: BuildInfo | null = null

function shortCommit(raw: string | undefined): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 7)
}

function readBuildInfoFile(): Partial<BuildInfo> | null {
  try {
    return JSON.parse(fs.readFileSync(BUILD_INFO_PATH, 'utf8')) as Partial<BuildInfo>
  } catch {
    return null
  }
}

function gitShortCommit(): string | null {
  try {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
    return execSync('git rev-parse --short HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim() || null
  } catch {
    return null
  }
}

/** Deploy / build metadata for admin diagnostics. */
export function getBuildInfo(): BuildInfo {
  if (cached) return cached

  const fromFile = readBuildInfoFile()
  const commit =
    shortCommit(process.env.RAILWAY_GIT_COMMIT_SHA) ??
    shortCommit(process.env.GIT_COMMIT) ??
    shortCommit(fromFile?.commit ?? undefined) ??
    gitShortCommit()

  cached = {
    version: process.env.APP_VERSION?.trim() || fromFile?.version || 'dev',
    commit,
    builtAt: fromFile?.builtAt ?? null,
  }
  return cached
}
