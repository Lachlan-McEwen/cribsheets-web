import { randomUUID } from 'node:crypto'
import { getDb } from './db.js'

export type SupportRequestStatus = 'open' | 'closed'

export type SupportRequestRow = {
  id: string
  userId: string
  subject: string
  message: string
  status: SupportRequestStatus
  createdUtc: number
  closedUtc: number | null
}

export type SupportRequestWithUser = SupportRequestRow & {
  userEmail: string
  userName: string
  employeeNumber: string
  unitStation: string
}

function rowToSupportRequest(row: {
  id: string
  user_id: string
  subject: string
  message: string
  status: string
  created_utc: number
  closed_utc: number | null
}): SupportRequestRow {
  return {
    id: row.id,
    userId: row.user_id,
    subject: row.subject,
    message: row.message,
    status: row.status as SupportRequestStatus,
    createdUtc: row.created_utc,
    closedUtc: row.closed_utc,
  }
}

export function createSupportRequest(userId: string, subject: string, message: string): SupportRequestRow {
  const id = randomUUID()
  const now = Date.now()
  getDb()
    .prepare(
      `INSERT INTO support_requests (id, user_id, subject, message, status, created_utc, closed_utc)
       VALUES (?, ?, ?, ?, 'open', ?, NULL)`,
    )
    .run(id, userId, subject, message, now)
  return {
    id,
    userId,
    subject,
    message,
    status: 'open',
    createdUtc: now,
    closedUtc: null,
  }
}

export function listSupportRequests(limit = 200): SupportRequestWithUser[] {
  const capped = Math.min(Math.max(limit, 1), 500)
  const rows = getDb()
    .prepare(
      `SELECT sr.id, sr.user_id, sr.subject, sr.message, sr.status, sr.created_utc, sr.closed_utc,
              u.email AS user_email, u.name AS user_name,
              u.employee_number AS employee_number, u.unit_station AS unit_station
       FROM support_requests sr
       JOIN users u ON u.id = sr.user_id
       ORDER BY sr.created_utc DESC
       LIMIT ?`,
    )
    .all(capped) as {
    id: string
    user_id: string
    subject: string
    message: string
    status: string
    created_utc: number
    closed_utc: number | null
    user_email: string
    user_name: string
    employee_number: string
    unit_station: string
  }[]
  return rows.map((row) => ({
    ...rowToSupportRequest(row),
    userEmail: row.user_email,
    userName: row.user_name,
    employeeNumber: row.employee_number,
    unitStation: row.unit_station,
  }))
}

export function findSupportRequest(id: string): SupportRequestWithUser | null {
  const row = getDb()
    .prepare(
      `SELECT sr.id, sr.user_id, sr.subject, sr.message, sr.status, sr.created_utc, sr.closed_utc,
              u.email AS user_email, u.name AS user_name,
              u.employee_number AS employee_number, u.unit_station AS unit_station
       FROM support_requests sr
       JOIN users u ON u.id = sr.user_id
       WHERE sr.id = ?`,
    )
    .get(id) as
    | {
        id: string
        user_id: string
        subject: string
        message: string
        status: string
        created_utc: number
        closed_utc: number | null
        user_email: string
        user_name: string
        employee_number: string
        unit_station: string
      }
    | undefined
  if (!row) return null
  return {
    ...rowToSupportRequest(row),
    userEmail: row.user_email,
    userName: row.user_name,
    employeeNumber: row.employee_number,
    unitStation: row.unit_station,
  }
}

export function setSupportRequestStatus(id: string, status: SupportRequestStatus): SupportRequestRow | null {
  const closedUtc = status === 'closed' ? Date.now() : null
  const result = getDb()
    .prepare(
      `UPDATE support_requests SET status = ?, closed_utc = ? WHERE id = ?`,
    )
    .run(status, closedUtc, id)
  if (result.changes === 0) return null
  const row = getDb()
    .prepare(
      `SELECT id, user_id, subject, message, status, created_utc, closed_utc
       FROM support_requests WHERE id = ?`,
    )
    .get(id) as Parameters<typeof rowToSupportRequest>[0] | undefined
  return row ? rowToSupportRequest(row) : null
}

export function listAdminNotificationEmails(): string[] {
  const fromEnv = process.env.SUPPORT_ALERT_EMAIL?.trim()
  if (fromEnv) {
    return fromEnv
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@'))
  }
  const rows = getDb()
    .prepare(`SELECT email FROM users WHERE is_admin = 1 ORDER BY email COLLATE NOCASE`)
    .all() as { email: string }[]
  return rows.map((r) => r.email.toLowerCase())
}
