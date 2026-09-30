import { randomUUID } from 'node:crypto'
import { getDb } from './db.js'

export type AppErrorLogEntry = {
  id: number
  createdUtc: number
  level: string
  category: string
  message: string
  exception: string | null
  requestPath: string | null
  userId: string | null
  traceId: string | null
}

export type SchemaMigrationResult = {
  migrationId: string
  status: string
  message: string
  exception: string | null
}

let loggingAvailable = false
let migrationRunUtc: number | null = null
let migrationResults: SchemaMigrationResult[] = []

export function setMigrationResults(results: SchemaMigrationResult[]): void {
  migrationRunUtc = Date.now()
  migrationResults = results
}

export function getMigrationStatus(): { migrationRunUtc: number | null; migrationResults: SchemaMigrationResult[] } {
  return { migrationRunUtc, migrationResults }
}

export function setLoggingAvailable(available: boolean): void {
  loggingAvailable = available
}

export function isLoggingAvailable(): boolean {
  return loggingAvailable
}

export function tryWriteErrorLog(entry: {
  level: string
  category: string
  message: string
  exception?: string | null
  requestPath?: string | null
  userId?: string | null
  traceId?: string | null
}): void {
  if (!loggingAvailable) return
  try {
    getDb()
      .prepare(
        `INSERT INTO app_error_logs
          (created_utc, level, category, message, exception, request_path, user_id, trace_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        Date.now(),
        entry.level.slice(0, 20),
        entry.category.slice(0, 500),
        entry.message,
        entry.exception ?? null,
        entry.requestPath?.slice(0, 500) ?? null,
        entry.userId?.slice(0, 450) ?? null,
        entry.traceId?.slice(0, 100) ?? randomUUID(),
      )
  } catch {
    // never fail the request
  }
}

export function getRecentErrorLogs(limit = 100): AppErrorLogEntry[] {
  if (!loggingAvailable || limit <= 0) return []
  const rows = getDb()
    .prepare(
      `SELECT id, created_utc AS createdUtc, level, category, message, exception,
              request_path AS requestPath, user_id AS userId, trace_id AS traceId
       FROM app_error_logs ORDER BY created_utc DESC LIMIT ?`,
    )
    .all(limit) as AppErrorLogEntry[]
  return rows
}
