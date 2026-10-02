import { getDb } from './db.js'

export type EmailLogStatus = 'logged_only' | 'sent' | 'failed'

export type EmailLogKind =
  | 'verify_email'
  | 'password_reset'
  | 'admin_test'
  | 'support_alert'
  | 'generic'

export type EmailLogEntry = {
  id: number
  createdUtc: number
  kind: EmailLogKind
  toEmail: string
  subject: string
  status: EmailLogStatus
  providerMessageId: string | null
  textBody: string
  htmlBody: string | null
  error: string | null
  userId: string | null
}

type InsertEmailLogInput = {
  kind: EmailLogKind
  toEmail: string
  subject: string
  textBody: string
  htmlBody?: string | null
  userId?: string | null
}

export function insertEmailLog(input: InsertEmailLogInput): number {
  const now = Date.now()
  const result = getDb()
    .prepare(
      `INSERT INTO email_logs
        (created_utc, kind, to_email, subject, status, text_body, html_body, user_id)
       VALUES (?, ?, ?, ?, 'logged_only', ?, ?, ?)`,
    )
    .run(
      now,
      input.kind,
      input.toEmail.trim().toLowerCase(),
      input.subject,
      input.textBody,
      input.htmlBody ?? null,
      input.userId ?? null,
    )
  return Number(result.lastInsertRowid)
}

export function updateEmailLog(
  id: number,
  patch: {
    status: EmailLogStatus
    providerMessageId?: string | null
    error?: string | null
  },
): void {
  getDb()
    .prepare(
      `UPDATE email_logs
       SET status = ?,
           provider_message_id = COALESCE(?, provider_message_id),
           error = COALESCE(?, error)
       WHERE id = ?`,
    )
    .run(patch.status, patch.providerMessageId ?? null, patch.error ?? null, id)
}

function rowToEntry(row: {
  id: number
  created_utc: number
  kind: string
  to_email: string
  subject: string
  status: string
  provider_message_id: string | null
  text_body: string
  html_body: string | null
  error: string | null
  user_id: string | null
}): EmailLogEntry {
  return {
    id: row.id,
    createdUtc: row.created_utc,
    kind: row.kind as EmailLogKind,
    toEmail: row.to_email,
    subject: row.subject,
    status: row.status as EmailLogStatus,
    providerMessageId: row.provider_message_id,
    textBody: row.text_body,
    htmlBody: row.html_body,
    error: row.error,
    userId: row.user_id,
  }
}

export function listRecentEmailLogs(limit = 50): EmailLogEntry[] {
  const capped = Math.min(Math.max(limit, 1), 200)
  const rows = getDb()
    .prepare(
      `SELECT id, created_utc, kind, to_email, subject, status, provider_message_id,
              text_body, html_body, error, user_id
       FROM email_logs
       ORDER BY id DESC
       LIMIT ?`,
    )
    .all(capped) as Parameters<typeof rowToEntry>[0][]
  return rows.map(rowToEntry)
}

export function clearEmailLogs(): void {
  getDb().prepare(`DELETE FROM email_logs`).run()
}
