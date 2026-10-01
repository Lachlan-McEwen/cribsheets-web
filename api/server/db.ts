import Database from 'better-sqlite3'
import fs from 'node:fs'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { DB_PATH, DATA_DIR } from './dataDir.js'

export type UserRow = {
  id: string
  email: string
  name: string
  isAdmin: boolean
  employeeNumber: string
  unitStation: string
  casual: boolean
  isCountryEmployee: boolean
  defaultShiftHours: number | null
  defaultShiftCode: string
  emailVerifiedAt: number | null
}

const PASSWORD_SALT_BYTES = 16
const PASSWORD_KEY_LEN = 64
const SESSION_DAYS = 30

function hashPassword(password: string): string {
  const salt = randomBytes(PASSWORD_SALT_BYTES)
  const hash = scryptSync(password, salt, PASSWORD_KEY_LEN)
  return `${salt.toString('base64')}:${hash.toString('base64')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltB64, hashB64] = stored.split(':')
  if (!saltB64 || !hashB64) return false
  const salt = Buffer.from(saltB64, 'base64')
  const expected = Buffer.from(hashB64, 'base64')
  const actual = scryptSync(password, salt, expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

let dbSingleton: Database.Database | null = null

export function getDb(): Database.Database {
  if (dbSingleton) return dbSingleton
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  dbSingleton = db
  return db
}

function ensureColumn(db: Database.Database, table: string, column: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`)
  }
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      employee_number TEXT NOT NULL DEFAULT '',
      unit_station TEXT NOT NULL DEFAULT '',
      casual INTEGER NOT NULL DEFAULT 0,
      is_country_employee INTEGER NOT NULL DEFAULT 0,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS timesheets (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fortnight_ending TEXT NOT NULL,
      json TEXT NOT NULL,
      PRIMARY KEY (user_id, fortnight_ending)
    );

    CREATE TABLE IF NOT EXISTS app_error_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_utc INTEGER NOT NULL,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      exception TEXT,
      request_path TEXT,
      user_id TEXT,
      trace_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_error_logs_created ON app_error_logs(created_utc DESC);
  `)

  ensureColumn(db, 'users', 'default_shift_hours', 'default_shift_hours REAL')
  ensureColumn(db, 'users', 'default_shift_code', "default_shift_code TEXT NOT NULL DEFAULT 'None'")
  ensureColumn(db, 'users', 'email_verified_at', 'email_verified_at INTEGER')

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_utc INTEGER NOT NULL,
      kind TEXT NOT NULL,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_message_id TEXT,
      text_body TEXT NOT NULL,
      html_body TEXT,
      error TEXT,
      user_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_utc DESC);

    CREATE TABLE IF NOT EXISTS auth_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
  const backfillDone = db
    .prepare(`SELECT value FROM app_meta WHERE key = 'email_verify_backfill_v1'`)
    .get() as { value: string } | undefined
  if (!backfillDone) {
    db.prepare(`UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL`).run()
    db.prepare(`INSERT INTO app_meta (key, value) VALUES ('email_verify_backfill_v1', '1')`).run()
  }
}

const USER_SELECT = `u.id, u.email, u.name, u.is_admin AS isAdmin,
  u.employee_number AS employeeNumber, u.unit_station AS unitStation,
  u.casual, u.is_country_employee AS isCountryEmployee,
  u.default_shift_hours AS defaultShiftHours, u.default_shift_code AS defaultShiftCode,
  u.email_verified_at AS emailVerifiedAt`

type UserDbRow = {
  id: string
  email: string
  name: string
  isAdmin: number
  employeeNumber: string
  unitStation: string
  casual: number
  isCountryEmployee: number
  defaultShiftHours: number | null
  defaultShiftCode: string
  emailVerifiedAt: number | null
}

function rowToUser(row: UserDbRow): UserRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isAdmin: Boolean(row.isAdmin),
    employeeNumber: row.employeeNumber,
    unitStation: row.unitStation,
    casual: Boolean(row.casual),
    isCountryEmployee: Boolean(row.isCountryEmployee),
    defaultShiftHours: row.defaultShiftHours ?? null,
    defaultShiftCode: row.defaultShiftCode ?? 'None',
    emailVerifiedAt: row.emailVerifiedAt ?? null,
  }
}

export type CreateUserProfile = {
  name?: string
  employeeNumber?: string
  unitStation?: string
  casual?: boolean
  isCountryEmployee?: boolean
}

export function createUser(
  email: string,
  password: string,
  isAdmin = false,
  profile: CreateUserProfile = {},
): UserRow {
  const db = getDb()
  const normalized = email.trim().toLowerCase()
  const id = randomUUID()
  const now = Date.now()
  db.prepare(
    `INSERT INTO users (
      id, email, password_hash, name, employee_number, unit_station,
      casual, is_country_employee, is_admin, created_at, email_verified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    normalized,
    hashPassword(password),
    profile.name?.trim() ?? '',
    profile.employeeNumber?.trim() ?? '',
    profile.unitStation?.trim() ?? '',
    profile.casual ? 1 : 0,
    profile.isCountryEmployee ? 1 : 0,
    isAdmin ? 1 : 0,
    now,
    null,
  )
  return rowToUser({
    id,
    email: normalized,
    name: profile.name?.trim() ?? '',
    isAdmin: isAdmin ? 1 : 0,
    employeeNumber: profile.employeeNumber?.trim() ?? '',
    unitStation: profile.unitStation?.trim() ?? '',
    casual: profile.casual ? 1 : 0,
    isCountryEmployee: profile.isCountryEmployee ? 1 : 0,
    defaultShiftHours: null,
    defaultShiftCode: 'None',
    emailVerifiedAt: null,
  })
}

export function findUserByEmail(email: string): {
  id: string
  password_hash: string
  emailVerifiedAt: number | null
} | null {
  const row = getDb()
    .prepare(
      `SELECT id, password_hash, email_verified_at AS emailVerifiedAt
       FROM users WHERE email = ? COLLATE NOCASE`,
    )
    .get(email.trim().toLowerCase()) as
    | { id: string; password_hash: string; emailVerifiedAt: number | null }
    | undefined
  return row ?? null
}

export function getUserAuthState(userId: string): { passwordHash: string } | null {
  const row = getDb()
    .prepare(`SELECT password_hash FROM users WHERE id = ?`)
    .get(userId) as { password_hash: string } | undefined
  if (!row) return null
  return { passwordHash: row.password_hash }
}

export function setEmailVerified(userId: string): void {
  getDb().prepare(`UPDATE users SET email_verified_at = ? WHERE id = ?`).run(Date.now(), userId)
}

export function updateUserPassword(userId: string, password: string): void {
  getDb()
    .prepare(`UPDATE users SET password_hash = ? WHERE id = ?`)
    .run(hashPassword(password), userId)
}

export function deleteAllSessionsForUser(userId: string): void {
  getDb().prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId)
}

export function countUsers(): number {
  const row = getDb().prepare(`SELECT COUNT(*) AS c FROM users`).get() as { c: number }
  return row.c
}

export function setUserAdmin(email: string, isAdmin: boolean): void {
  getDb()
    .prepare(`UPDATE users SET is_admin = ? WHERE email = ? COLLATE NOCASE`)
    .run(isAdmin ? 1 : 0, email.trim().toLowerCase())
}

export function setUserAdminById(userId: string, isAdmin: boolean): void {
  getDb().prepare(`UPDATE users SET is_admin = ? WHERE id = ?`).run(isAdmin ? 1 : 0, userId)
}

export function countAdmins(): number {
  const row = getDb().prepare(`SELECT COUNT(*) AS c FROM users WHERE is_admin = 1`).get() as { c: number }
  return row.c
}

export function findUserById(userId: string): UserRow | null {
  const row = getDb()
    .prepare(
      `SELECT id, email, name, is_admin AS isAdmin,
              employee_number AS employeeNumber, unit_station AS unitStation,
              casual, is_country_employee AS isCountryEmployee,
              default_shift_hours AS defaultShiftHours, default_shift_code AS defaultShiftCode,
              email_verified_at AS emailVerifiedAt
       FROM users WHERE id = ?`,
    )
    .get(userId) as UserDbRow | undefined
  return row ? rowToUser(row) : null
}

export function listUsers(): UserRow[] {
  const rows = getDb()
    .prepare(`SELECT ${USER_SELECT} FROM users u ORDER BY u.email COLLATE NOCASE`)
    .all() as UserDbRow[]
  return rows.map(rowToUser)
}

export type ProfileUpdate = {
  name: string
  employeeNumber: string
  unitStation: string
  casual: boolean
  isCountryEmployee: boolean
  defaultShiftHours: number | null
  defaultShiftCode: string
}

export function updateUserProfile(userId: string, profile: ProfileUpdate): UserRow | null {
  getDb()
    .prepare(
      `UPDATE users SET
        name = ?, employee_number = ?, unit_station = ?,
        casual = ?, is_country_employee = ?,
        default_shift_hours = ?, default_shift_code = ?
       WHERE id = ?`,
    )
    .run(
      profile.name,
      profile.employeeNumber,
      profile.unitStation,
      profile.casual ? 1 : 0,
      profile.isCountryEmployee ? 1 : 0,
      profile.defaultShiftHours,
      profile.defaultShiftCode,
      userId,
    )
  return findUserById(userId)
}

export function deleteUserAccount(userId: string): void {
  const db = getDb()
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId)
  db.prepare(`DELETE FROM timesheets WHERE user_id = ?`).run(userId)
  db.prepare(`DELETE FROM users WHERE id = ?`).run(userId)
}

export function userIsAdmin(userId: string): boolean {
  const row = getDb()
    .prepare(`SELECT is_admin FROM users WHERE id = ?`)
    .get(userId) as { is_admin: number } | undefined
  return Boolean(row?.is_admin)
}

export function createSession(userId: string): { id: string; expiresAt: number } {
  const id = randomBytes(32).toString('base64url')
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  getDb()
    .prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`)
    .run(id, userId, expiresAt)
  return { id, expiresAt }
}

export function deleteSession(sessionId: string): void {
  getDb().prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId)
}

export function userForSession(sessionId: string): UserRow | null {
  const row = getDb()
    .prepare(
      `SELECT ${USER_SELECT}
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`,
    )
    .get(sessionId, Date.now()) as UserDbRow | undefined
  if (!row) return null
  return rowToUser(row)
}
