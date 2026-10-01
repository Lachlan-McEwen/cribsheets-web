import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { getDb } from './db.js'

export type AuthTokenType = 'verify_email' | 'password_reset'

const VERIFY_TTL_MS = 7 * 24 * 60 * 60 * 1000
const RESET_TTL_MS = 60 * 60 * 1000

function hashToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex')
}

function ttlForType(type: AuthTokenType): number {
  return type === 'verify_email' ? VERIFY_TTL_MS : RESET_TTL_MS
}

export function createAuthToken(userId: string, type: AuthTokenType): string {
  const plain = randomBytes(32).toString('base64url')
  const now = Date.now()
  getDb()
    .prepare(
      `INSERT INTO auth_tokens (id, user_id, type, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), userId, type, hashToken(plain), now + ttlForType(type), now)
  return plain
}

export function consumeAuthToken(plain: string, type: AuthTokenType): string | null {
  const hash = hashToken(plain)
  const now = Date.now()
  const db = getDb()
  const row = db
    .prepare(
      `SELECT id, user_id FROM auth_tokens
       WHERE token_hash = ? AND type = ? AND used_at IS NULL AND expires_at > ?`,
    )
    .get(hash, type, now) as { id: string; user_id: string } | undefined
  if (!row) return null
  db.prepare(`UPDATE auth_tokens SET used_at = ? WHERE id = ?`).run(now, row.id)
  return row.user_id
}

export function invalidateAuthTokensForUser(userId: string, type: AuthTokenType): void {
  getDb()
    .prepare(`DELETE FROM auth_tokens WHERE user_id = ? AND type = ?`)
    .run(userId, type)
}
