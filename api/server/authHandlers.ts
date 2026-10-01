import type http from 'node:http'
import {
  consumeAuthToken,
  createAuthToken,
  invalidateAuthTokensForUser,
} from './authTokens.js'
import { sendPasswordResetEmail, sendVerifyEmail } from './authEmail.js'
import {
  deleteAllSessionsForUser,
  findUserByEmail,
  findUserById,
  getUserAuthState,
  setEmailVerified,
  updateUserPassword,
  verifyPassword,
} from './db.js'
import { json, readJson } from './httpUtil.js'
import type { UserRow } from './db.js'
import { MIN_PASSWORD_LENGTH } from './register.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function genericOk(res: http.ServerResponse): void {
  json(res, 200, { ok: true })
}

export async function handleForgotPassword(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const body = await readJson<{ email?: string }>(req)
  const email = body.email?.trim().toLowerCase() ?? ''
  if (email && EMAIL_RE.test(email)) {
    const row = findUserByEmail(email)
    if (row) {
      invalidateAuthTokensForUser(row.id, 'password_reset')
      const token = createAuthToken(row.id, 'password_reset')
      try {
        await sendPasswordResetEmail(row.id, email, token)
      } catch (err) {
        console.error('[auth] password reset email failed', err)
      }
    }
  }
  genericOk(res)
}

export async function handleResetPassword(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const body = await readJson<{ token?: string; password?: string }>(req)
  const token = body.token?.trim() ?? ''
  const password = body.password ?? ''
  if (!token) {
    json(res, 400, { error: 'token_required' })
    return
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    json(res, 400, { error: 'password_too_short' })
    return
  }
  const userId = consumeAuthToken(token, 'password_reset')
  if (!userId) {
    json(res, 400, { error: 'invalid_or_expired_token' })
    return
  }
  updateUserPassword(userId, password)
  deleteAllSessionsForUser(userId)
  genericOk(res)
}

export async function handleVerifyEmail(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const token = url.searchParams.get('token')?.trim() ?? ''
  if (!token) {
    json(res, 400, { error: 'token_required' })
    return
  }
  const userId = consumeAuthToken(token, 'verify_email')
  if (!userId) {
    json(res, 400, { error: 'invalid_or_expired_token' })
    return
  }
  setEmailVerified(userId)
  json(res, 200, { ok: true, verified: true })
}

export async function handleResendVerification(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const body = await readJson<{ email?: string }>(req)
  const email = body.email?.trim().toLowerCase() ?? ''
  if (!email || !EMAIL_RE.test(email)) {
    genericOk(res)
    return
  }
  const row = findUserByEmail(email)
  if (!row || row.emailVerifiedAt != null) {
    genericOk(res)
    return
  }
  invalidateAuthTokensForUser(row.id, 'verify_email')
  const token = createAuthToken(row.id, 'verify_email')
  try {
    await sendVerifyEmail(row.id, email, token)
  } catch (err) {
    console.error('[auth] verification email failed', err)
  }
  genericOk(res)
}

export async function handleChangePassword(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  user: UserRow,
): Promise<void> {
  const body = await readJson<{ currentPassword?: string; newPassword?: string }>(req)
  const currentPassword = body.currentPassword ?? ''
  const newPassword = body.newPassword ?? ''
  if (!currentPassword || !newPassword) {
    json(res, 400, { error: 'passwords_required' })
    return
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    json(res, 400, { error: 'password_too_short' })
    return
  }
  const auth = getUserAuthState(user.id)
  if (!auth || !verifyPassword(currentPassword, auth.passwordHash)) {
    json(res, 401, { error: 'invalid_current_password' })
    return
  }
  updateUserPassword(user.id, newPassword)
  genericOk(res)
}

export async function sendVerificationForNewUser(userId: string, email: string): Promise<void> {
  invalidateAuthTokensForUser(userId, 'verify_email')
  const token = createAuthToken(userId, 'verify_email')
  await sendVerifyEmail(userId, email, token)
}
