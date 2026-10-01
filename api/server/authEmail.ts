import { deliverEmail } from './email.js'
import { publicAppUrl } from './publicAppUrl.js'

export async function sendVerifyEmail(userId: string, email: string, token: string): Promise<void> {
  const link = `${publicAppUrl()}/verify-email?token=${encodeURIComponent(token)}`
  const subject = 'Verify your Crib Sheets email'
  const text = `Welcome to Crib Sheets. Verify your email by opening this link:\n\n${link}\n\nIf you did not create an account, you can ignore this email.`
  const html = `<p>Welcome to Crib Sheets.</p><p><a href="${link}">Verify your email address</a></p><p>If you did not create an account, you can ignore this email.</p>`
  await deliverEmail(
    { to: email, subject, text, html },
    { kind: 'verify_email', userId },
  )
}

export async function sendPasswordResetEmail(userId: string, email: string, token: string): Promise<void> {
  const link = `${publicAppUrl()}/reset-password?token=${encodeURIComponent(token)}`
  const subject = 'Reset your Crib Sheets password'
  const text = `Reset your password by opening this link (valid for 1 hour):\n\n${link}\n\nIf you did not request this, you can ignore this email.`
  const html = `<p>Reset your password using the link below (valid for 1 hour).</p><p><a href="${link}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`
  await deliverEmail(
    { to: email, subject, text, html },
    { kind: 'password_reset', userId },
  )
}
