import type http from 'node:http'
import { isValidUserId } from './httpUtil.js'

export const LEGACY_USER_ID_HEADER = 'x-legacy-user-id'

/** Matches playwright.config.ts when LEGACY_API_SECRET is not set on the API process. */
export const E2E_DEFAULT_LEGACY_API_SECRET = 'playwright-legacy-api-secret'

export function legacyApiSecret(): string | null {
  const secret = process.env.LEGACY_API_SECRET?.trim()
  if (secret) return secret
  if (process.env.E2E_TEST_HOOKS === 'true') {
    return process.env.E2E_LEGACY_API_SECRET?.trim() || E2E_DEFAULT_LEGACY_API_SECRET
  }
  return null
}

export function legacyApiEnabled(): boolean {
  return legacyApiSecret() !== null
}

export type LegacyAuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string }

export function authenticateLegacyRequest(req: http.IncomingMessage): LegacyAuthResult {
  const secret = legacyApiSecret()
  if (!secret) {
    return { ok: false, status: 503, error: 'legacy_api_disabled' }
  }

  const auth = req.headers.authorization?.trim() ?? ''
  if (auth !== `Bearer ${secret}`) {
    return { ok: false, status: 401, error: 'unauthorized' }
  }

  const raw = req.headers[LEGACY_USER_ID_HEADER]
  const userId = (typeof raw === 'string' ? raw : raw?.[0] ?? '').trim()
  if (!isValidUserId(userId)) {
    return { ok: false, status: 400, error: 'invalid_user_id' }
  }

  return { ok: true, userId }
}
