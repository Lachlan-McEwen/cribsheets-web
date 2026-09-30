import { createUser, findUserByEmail, setUserAdmin } from './db.js'

export function ensureBootstrapAdmin(): void {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) return

  const profile = {
    name: process.env.ADMIN_NAME?.trim() ?? 'Admin',
    employeeNumber: process.env.ADMIN_EMPLOYEE_NUMBER?.trim() ?? '',
    unitStation: process.env.ADMIN_UNIT_STATION?.trim() ?? '',
    casual: process.env.ADMIN_CASUAL === 'true',
    isCountryEmployee: process.env.ADMIN_COUNTRY_EMPLOYEE === 'true',
  }

  const existing = findUserByEmail(email)
  if (existing) {
    setUserAdmin(email, true)
    console.log(`[bootstrap] Admin ensured for existing user ${email}`)
    return
  }

  createUser(email, password, true, profile)
  console.log(`[bootstrap] Created admin user ${email}`)
}
