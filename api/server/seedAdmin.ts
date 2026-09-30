import { ensureBootstrapAdmin } from './bootstrapAdmin.js'
import { findUserByEmail } from './db.js'
import { loadEnvFiles } from './env.js'

loadEnvFiles()

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD

if (!email || !password) {
  console.error('[seed:admin] Set ADMIN_EMAIL and ADMIN_PASSWORD (Railway variables or api/.env).')
  process.exit(1)
}

ensureBootstrapAdmin()

const row = findUserByEmail(email)
if (!row) {
  console.error(`[seed:admin] Failed to create or find user ${email}.`)
  process.exit(1)
}

console.log(`[seed:admin] OK — admin ready for ${email}`)
