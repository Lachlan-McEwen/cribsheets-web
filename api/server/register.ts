import { sendVerificationForNewUser } from './authHandlers.js'
import { countUsers, createUser, findUserByEmail } from './db.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD_LENGTH = 8
const MAX_NAME_LENGTH = 120

export type RegisterInput = { email: string; password: string; name: string }

export type RegisterError =
  | 'registration_closed'
  | 'registration_full'
  | 'invalid_email'
  | 'password_too_short'
  | 'email_taken'
  | 'name_required'
  | 'name_too_long'

export function registrationAllowed(): boolean {
  if (process.env.ALLOW_REGISTRATION !== 'true') return false
  const max = Number.parseInt(process.env.MAX_USERS ?? '200', 10)
  if (Number.isFinite(max) && max > 0 && countUsers() >= max) return false
  return true
}

export function validateRegisterInput(body: {
  email?: string
  password?: string
  name?: string
}): RegisterInput | RegisterError {
  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  const name = body.name?.trim() ?? ''
  if (!name) return 'name_required'
  if (name.length > MAX_NAME_LENGTH) return 'name_too_long'
  if (!EMAIL_RE.test(email)) return 'invalid_email'
  if (password.length < MIN_PASSWORD_LENGTH) return 'password_too_short'
  return { email, password, name }
}

export function registerUser(
  input: RegisterInput,
): { ok: true; userId: string } | { ok: false; error: RegisterError } {
  if (!registrationAllowed()) {
    return { ok: false, error: 'registration_closed' }
  }
  if (findUserByEmail(input.email)) {
    return { ok: false, error: 'email_taken' }
  }
  const user = createUser(input.email, input.password, false, { name: input.name })
  return { ok: true, userId: user.id, email: user.email }
}

export async function completeRegistration(
  userId: string,
  email: string,
): Promise<{ ok: true } | { ok: false; error: 'verification_email_failed' }> {
  try {
    await sendVerificationForNewUser(userId, email)
    return { ok: true }
  } catch {
    return { ok: false, error: 'verification_email_failed' }
  }
}
