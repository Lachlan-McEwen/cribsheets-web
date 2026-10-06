import { createAuthToken, invalidateAuthTokensForUser } from './authTokens.js'
import { sendPasswordResetEmail, sendVerifyEmail } from './authEmail.js'
import { findUserById } from './db.js'
import { deliverEmail } from './email.js'
import { getEmailLogById, type EmailLogKind } from './emailLog.js'

export type ResendEmailLogErrorCode = 'not_found' | 'user_not_found' | 'already_verified'

export class ResendEmailLogError extends Error {
  readonly code: ResendEmailLogErrorCode

  constructor(code: ResendEmailLogErrorCode) {
    super(code)
    this.code = code
  }
}

export async function resendEmailFromLog(logId: number): Promise<{ id: string }> {
  const entry = getEmailLogById(logId)
  if (!entry) throw new ResendEmailLogError('not_found')

  if (entry.kind === 'verify_email' && entry.userId) {
    const user = findUserById(entry.userId)
    if (!user) throw new ResendEmailLogError('user_not_found')
    if (user.emailVerifiedAt != null) throw new ResendEmailLogError('already_verified')
    invalidateAuthTokensForUser(user.id, 'verify_email')
    const token = createAuthToken(user.id, 'verify_email')
    return sendVerifyEmail(user.id, entry.toEmail, token)
  }

  if (entry.kind === 'password_reset' && entry.userId) {
    const user = findUserById(entry.userId)
    if (!user) throw new ResendEmailLogError('user_not_found')
    invalidateAuthTokensForUser(user.id, 'password_reset')
    const token = createAuthToken(user.id, 'password_reset')
    return sendPasswordResetEmail(user.id, entry.toEmail, token)
  }

  return deliverEmail(
    {
      to: entry.toEmail,
      subject: entry.subject,
      text: entry.textBody,
      html: entry.htmlBody ?? undefined,
    },
    { kind: entry.kind as EmailLogKind, userId: entry.userId },
  )
}
