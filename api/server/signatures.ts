import fs from 'node:fs'
import path from 'node:path'
import { DATA_DIR } from './dataDir.js'

export const SIGNATURES_DIR = path.join(DATA_DIR, 'signatures')

export function signaturePathForUser(userId: string): string {
  return path.join(SIGNATURES_DIR, `${userId}.png`)
}

export function userHasSignature(userId: string): boolean {
  try {
    return fs.existsSync(signaturePathForUser(userId))
  } catch {
    return false
  }
}

export function saveSignaturePng(userId: string, pngBytes: Buffer): void {
  fs.mkdirSync(SIGNATURES_DIR, { recursive: true })
  fs.writeFileSync(signaturePathForUser(userId), pngBytes)
}

export function deleteSignature(userId: string): void {
  try {
    fs.unlinkSync(signaturePathForUser(userId))
  } catch {
    // ignore
  }
}

/** Accept `data:image/png;base64,...` from the profile canvas. */
export function parseSignatureDataUrl(dataUrl: string): Buffer | null {
  const m = /^data:image\/png;base64,(.+)$/i.exec(dataUrl.trim())
  if (!m) return null
  try {
    return Buffer.from(m[1], 'base64')
  } catch {
    return null
  }
}
