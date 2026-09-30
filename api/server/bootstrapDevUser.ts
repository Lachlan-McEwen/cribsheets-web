import { createUser, findUserByEmail } from './db.js'

export function ensureBootstrapDevUser(): void {
  if (process.env.NODE_ENV === 'production') return
  const email = process.env.DEV_USER_EMAIL?.trim().toLowerCase()
  const password = process.env.DEV_USER_PASSWORD
  if (!email || !password) return

  if (findUserByEmail(email)) {
    console.log(`[bootstrap] Dev user already exists: ${email}`)
    return
  }

  createUser(email, password, false, {
    name: process.env.DEV_USER_NAME?.trim() ?? 'Dev User',
    employeeNumber: process.env.DEV_USER_EMPLOYEE_NUMBER?.trim() ?? '0000',
    unitStation: process.env.DEV_USER_UNIT_STATION?.trim() ?? 'DEV',
  })
  console.log(`[bootstrap] Created dev user ${email}`)
}
