import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

let commit = null
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim()
} catch {
  // Not a git checkout (e.g. exported tarball)
}

const info = {
  version: pkg.version,
  commit,
  builtAt: new Date().toISOString(),
}

const outPath = path.join(root, 'api/server/build-info.json')
fs.writeFileSync(outPath, `${JSON.stringify(info, null, 2)}\n`)
console.log('Wrote build info to api/server/build-info.json', info)
