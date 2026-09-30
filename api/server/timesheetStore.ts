import fs from 'node:fs'
import { getDb } from './db.js'
import { outputPathForFileName } from './timesheetExport.js'

export type TimesheetSummary = {
  userId: string
  fortnightEnding: string
  lastUpdated: number
  googleFileId: string | null
  outputFileName: string | null
  hasOutput: boolean
  daysComplete: number
  totalDays: number
  isUploaded: boolean
}

export type StoredTimesheetPayload = {
  lastUpdated: number
  googleFileId: string | null
  outputFileName: string | null
  document: Record<string, unknown>
}

export type SaveTimesheetResult =
  | { ok: true; payload: StoredTimesheetPayload }
  | { ok: false; reason: 'conflict'; serverLastUpdated: number }

function parsePayload(json: string): StoredTimesheetPayload | null {
  try {
    const parsed = JSON.parse(json) as StoredTimesheetPayload
    if (!parsed || typeof parsed !== 'object' || !parsed.document) return null
    return {
      ...parsed,
      outputFileName: parsed.outputFileName ?? null,
    }
  } catch {
    return null
  }
}

function hasOutputFile(outputFileName: string | null): boolean {
  if (!outputFileName) return false
  try {
    return fs.existsSync(outputPathForFileName(outputFileName))
  } catch {
    return false
  }
}

function buildSummary(userId: string, fortnightEnding: string, payload: StoredTimesheetPayload): TimesheetSummary {
  const days = Array.isArray(payload.document.days) ? payload.document.days : []
  const daysComplete = days.filter((d) => d && typeof d === 'object' && (d as { done?: boolean }).done).length
  const outputFileName = payload.outputFileName ?? null
  return {
    userId,
    fortnightEnding,
    lastUpdated: payload.lastUpdated ?? 0,
    googleFileId: payload.googleFileId ?? null,
    outputFileName,
    hasOutput: hasOutputFile(outputFileName),
    daysComplete,
    totalDays: days.length,
    isUploaded: Boolean(payload.googleFileId),
  }
}

export function getTimesheet(userId: string, fortnightEnding: string): StoredTimesheetPayload | null {
  const row = getDb()
    .prepare(`SELECT json FROM timesheets WHERE user_id = ? AND fortnight_ending = ?`)
    .get(userId, fortnightEnding) as { json: string } | undefined
  if (!row) return null
  return parsePayload(row.json)
}

function writePayload(userId: string, fortnightEnding: string, payload: StoredTimesheetPayload): void {
  getDb()
    .prepare(
      `INSERT INTO timesheets (user_id, fortnight_ending, json) VALUES (?, ?, ?)
       ON CONFLICT(user_id, fortnight_ending) DO UPDATE SET json = excluded.json`,
    )
    .run(userId, fortnightEnding, JSON.stringify(payload))
}

export function saveTimesheet(
  userId: string,
  fortnightEnding: string,
  document: Record<string, unknown>,
  options?: { ifUnmodifiedSince?: number | null; clearOutput?: boolean },
): SaveTimesheetResult {
  const existing = getTimesheet(userId, fortnightEnding)

  if (existing && options?.ifUnmodifiedSince != null) {
    if (existing.lastUpdated !== options.ifUnmodifiedSince) {
      return { ok: false, reason: 'conflict', serverLastUpdated: existing.lastUpdated }
    }
  }

  const payload: StoredTimesheetPayload = {
    lastUpdated: Date.now(),
    googleFileId: existing?.googleFileId ?? null,
    outputFileName: options?.clearOutput ? null : (existing?.outputFileName ?? null),
    document,
  }
  writePayload(userId, fortnightEnding, payload)
  return { ok: true, payload }
}

export function setTimesheetOutput(
  userId: string,
  fortnightEnding: string,
  outputFileName: string,
  document: Record<string, unknown>,
): StoredTimesheetPayload {
  const existing = getTimesheet(userId, fortnightEnding)
  const payload: StoredTimesheetPayload = {
    lastUpdated: Date.now(),
    googleFileId: existing?.googleFileId ?? null,
    outputFileName,
    document,
  }
  writePayload(userId, fortnightEnding, payload)
  return payload
}

export function getSummariesForUser(userId: string): TimesheetSummary[] {
  const rows = getDb()
    .prepare(`SELECT fortnight_ending AS fortnightEnding, json FROM timesheets WHERE user_id = ? ORDER BY fortnight_ending DESC`)
    .all(userId) as { fortnightEnding: string; json: string }[]

  const out: TimesheetSummary[] = []
  for (const row of rows) {
    const payload = parsePayload(row.json)
    if (payload) out.push(buildSummary(userId, row.fortnightEnding, payload))
  }
  return out
}

export function getSummariesForFortnight(fortnightEnding: string): Map<string, TimesheetSummary> {
  const rows = getDb()
    .prepare(`SELECT user_id AS userId, fortnight_ending AS fortnightEnding, json FROM timesheets WHERE fortnight_ending = ?`)
    .all(fortnightEnding) as { userId: string; fortnightEnding: string; json: string }[]

  const map = new Map<string, TimesheetSummary>()
  for (const row of rows) {
    const payload = parsePayload(row.json)
    if (payload) map.set(row.userId, buildSummary(row.userId, row.fortnightEnding, payload))
  }
  return map
}

export function deleteTimesheetsForUser(userId: string): void {
  getDb().prepare(`DELETE FROM timesheets WHERE user_id = ?`).run(userId)
}
