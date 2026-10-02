import type http from 'node:http'
import { ensureStubUserForTimesheet } from './db.js'
import { authenticateLegacyRequest } from './legacyApiAuth.js'
import { legacyTimesheetResponse, normalizeLegacyTimesheetBody } from './legacyTimesheet.js'
import { isReasonableFortnightEnding, parseFortnightParam } from './fortnight.js'
import { json, readJson } from './httpUtil.js'
import { getTimesheet, saveTimesheet } from './timesheetStore.js'

function parseLegacyFortnight(path: string): { fortnightEnding: string } | null {
  const match = /^\/api\/legacy\/timesheets\/(\d{4}-\d{2}-\d{2})$/.exec(path)
  if (!match) return null
  const fortnightEnding = match[1]
  const endingDate = parseFortnightParam(fortnightEnding)
  if (!endingDate || !isReasonableFortnightEnding(endingDate)) return null
  return { fortnightEnding }
}

export async function tryHandleLegacyApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
): Promise<boolean> {
  const path = url.pathname
  if (!path.startsWith('/api/legacy/')) return false

  const auth = authenticateLegacyRequest(req)
  if (!auth.ok) {
    json(res, auth.status, { error: auth.error })
    return true
  }

  const fortnight = parseLegacyFortnight(path)
  if (!fortnight) {
    json(res, 404, { error: 'not_found' })
    return true
  }

  const { userId } = auth
  const { fortnightEnding } = fortnight
  const method = req.method ?? 'GET'

  if (method === 'GET') {
    const stored = getTimesheet(userId, fortnightEnding)
    if (!stored) {
      json(res, 404, { error: 'not_found' })
      return true
    }
    json(res, 200, legacyTimesheetResponse(fortnightEnding, stored))
    return true
  }

  if (method === 'PUT') {
    const body = await readJson<{
      timesheet?: Record<string, unknown>
      ifUnmodifiedSince?: number | null
      onlyIfServerLastUpdatedBefore?: number | null
    }>(req)

    const rawTimesheet = body.timesheet
    if (!rawTimesheet || typeof rawTimesheet !== 'object') {
      json(res, 400, { error: 'timesheet_required' })
      return true
    }

    ensureStubUserForTimesheet(userId)

    const { document, googleFileId, outputFileName } = normalizeLegacyTimesheetBody(rawTimesheet)
    const saved = saveTimesheet(userId, fortnightEnding, document, {
      ifUnmodifiedSince: body.ifUnmodifiedSince ?? null,
      onlyIfServerLastUpdatedBefore: body.onlyIfServerLastUpdatedBefore ?? null,
      googleFileId,
      outputFileName,
    })

    if (!saved.ok) {
      json(res, 409, { error: 'conflict', serverLastUpdated: saved.serverLastUpdated })
      return true
    }

    const response = legacyTimesheetResponse(fortnightEnding, saved.payload)
    if (saved.skipped) {
      json(res, 200, { ...response, skipped: true })
      return true
    }

    json(res, 200, response)
    return true
  }

  json(res, 405, { error: 'method_not_allowed' })
  return true
}
