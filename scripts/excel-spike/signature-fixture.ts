import fs from 'node:fs'
import path from 'node:path'

const fixturesDir = path.join(import.meta.dir, 'fixtures')
export const testSignaturePngPath = path.join(fixturesDir, 'test-signature.png')

/** Minimal valid PNG for spikes when no fixture checked in. */
function writeMinimalPng(out: string): void {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAMgAAAAUCAYAAACjN6EAAAAHEElEQVR42mNk+M9Qz0AEYBxVSFUAAP//AwD0BQoB3aR+YQAAAABJRU5ErkJggg=='
  fs.writeFileSync(out, Buffer.from(base64, 'base64'))
}

export function ensureTestSignaturePng(): string {
  fs.mkdirSync(fixturesDir, { recursive: true })
  if (!fs.existsSync(testSignaturePngPath) || fs.statSync(testSignaturePngPath).size < 200) {
    writeMinimalPng(testSignaturePngPath)
  }
  return testSignaturePngPath
}
