import fs from 'node:fs'
import path from 'node:path'

/** Matches api/server/dataDir.ts when the API process cwd is `api/`. */
export function e2eDataDirCandidates(): string[] {
  const root = process.cwd()
  return [
    path.join(root, 'api', 'data-e2e'),
    // Legacy: DATA_DIR was `api/data-e2e` while cwd was already `api/`.
    path.join(root, 'api', 'api', 'data-e2e'),
  ]
}

function wipeE2eDataDir(dataDir: string): void {
  if (!fs.existsSync(dataDir)) return
  for (const name of ['cribsheets.sqlite', 'cribsheets.sqlite-wal', 'cribsheets.sqlite-shm']) {
    try {
      fs.unlinkSync(path.join(dataDir, name))
    } catch {
      // ignore missing / locked
    }
  }
  for (const sub of ['signatures', 'output']) {
    const p = path.join(dataDir, sub)
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true })
    }
  }
}

/** Remove e2e SQLite + artifact dirs (safe before Playwright starts the API). */
export function resetE2eDataOnDisk(): void {
  for (const dir of e2eDataDirCandidates()) {
    wipeE2eDataDir(dir)
  }
}
