import fs from 'node:fs'
import type http from 'node:http'
import {
  countAdmins,
  countUsers,
  deleteUserAccount,
  findUserById,
  getRegistrationOpenSetting,
  listUsers,
  setRegistrationOpenSetting,
  setUserAdminById,
  updateUserProfile,
  type UserRow,
} from './db.js'
import {
  getMigrationStatus,
  getRecentErrorLogs,
  isLoggingAvailable,
  tryWriteErrorLog,
} from './errorLog.js'
import {
  getAllFortnightDates,
  getCurrentFortnightEnding,
  isFortnightEndingForType,
  isReasonableFortnightEnding,
  parseFortnightParam,
  toFortnightParam,
} from './fortnight.js'
import { isValidUserId, json, readJson } from './httpUtil.js'
import {
  deleteSignature,
  parseSignatureDataUrl,
  saveSignaturePng,
  signaturePathForUser,
  userHasSignature,
} from './signatures.js'
import { getTemplateVersion } from '../../lib/timesheet-export/template-version.js'
import type { TimesheetDocument } from '../../lib/timesheet-export/legacy-types.js'
import { normalizeTimesheetDocumentForSave } from '../../lib/timesheet-form/normalize-document.js'
import { outputPathForFileName, writeTimesheetXlsm } from './timesheetExport.js'
import {
  getSummariesForFortnight,
  getSummariesForUser,
  getTimesheet,
  saveTimesheet,
  setTimesheetOutput,
} from './timesheetStore.js'
import { deliverEmail, emailConfigStatus } from './email.js'
import { parseOptionalEmail } from './emailFormat.js'
import { listRecentEmailLogs } from './emailLog.js'
import { ResendEmailLogError, resendEmailFromLog } from './emailResend.js'
import { notifyAdminsOfSupportRequest } from './supportNotify.js'
import {
  createSupportRequest,
  findSupportRequest,
  listSupportRequests,
  setSupportRequestStatus,
  type SupportRequestStatus,
} from './supportRequests.js'
import { e2eTestHooksEnabled } from './testHooks.js'
import { isRegistrationAtUserCap, registrationAllowed, registrationMaxUsers } from './register.js'
import { toApiUser } from './userApi.js'
import { getBuildInfo } from './buildInfo.js'

function adminRegistrationPayload() {
  const max = registrationMaxUsers()
  return {
    open: getRegistrationOpenSetting(),
    acceptingSignups: registrationAllowed(),
    userCount: countUsers(),
    maxUsers: Number.isFinite(max) && max > 0 ? max : null,
    atUserCap: isRegistrationAtUserCap(),
  }
}

function requireUser(getUser: () => UserRow | null, res: http.ServerResponse): UserRow | null {
  const user = getUser()
  if (!user) {
    json(res, 401, { error: 'not_authenticated' })
    return null
  }
  return user
}

function requireAdmin(getUser: () => UserRow | null, res: http.ServerResponse): UserRow | null {
  const user = requireUser(getUser, res)
  if (!user) return null
  if (!user.isAdmin) {
    json(res, 403, { error: 'forbidden' })
    return null
  }
  return user
}

function sendPng(res: http.ServerResponse, filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false
  const data = fs.readFileSync(filePath)
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Cache-Control': 'private, no-store',
  })
  res.end(data)
  return true
}

function matchesUserSearch(
  row: {
    email: string
    name: string
    employeeNumber: string
    unitStation: string
  },
  search: string,
): boolean {
  const term = search.trim()
  if (!term) return true
  const hay = [row.email, row.name, row.employeeNumber, row.unitStation]
  return hay.some((v) => v.toLowerCase().includes(term.toLowerCase()))
}

export async function tryHandleApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  getUser: () => UserRow | null,
): Promise<boolean> {
  const path = url.pathname
  const method = req.method ?? 'GET'

  if (method === 'GET' && path === '/api/profile/signature') {
    const user = requireUser(getUser, res)
    if (!user) return true
    if (!sendPng(res, signaturePathForUser(user.id))) {
      json(res, 404, { error: 'not_found' })
    }
    return true
  }

  if (method === 'PUT' && path === '/api/profile') {
    const user = requireUser(getUser, res)
    if (!user) return true
    const body = await readJson<{
      name?: string
      employeeNumber?: string
      unitStation?: string
      casual?: boolean
      isCountryEmployee?: boolean
      defaultShiftHours?: number | null
      defaultShiftCode?: string
      authorisingManagerEmail?: string | null
      signatureDataUrl?: string | null
    }>(req)

    if (body.signatureDataUrl) {
      const png = parseSignatureDataUrl(body.signatureDataUrl)
      if (!png) {
        json(res, 400, { error: 'invalid_signature' })
        return true
      }
      saveSignaturePng(user.id, png)
    }

    const managerEmailParsed =
      body.authorisingManagerEmail !== undefined
        ? parseOptionalEmail(body.authorisingManagerEmail)
        : user.authorisingManagerEmail || null
    if (managerEmailParsed === 'invalid') {
      json(res, 400, { error: 'invalid_authorising_manager_email' })
      return true
    }

    const updated = updateUserProfile(user.id, {
      name: (body.name ?? user.name).trim(),
      employeeNumber: (body.employeeNumber ?? user.employeeNumber).trim(),
      unitStation: (body.unitStation ?? user.unitStation).trim(),
      casual: Boolean(body.casual),
      isCountryEmployee: Boolean(body.isCountryEmployee),
      defaultShiftHours:
        body.defaultShiftHours === null || body.defaultShiftHours === undefined
          ? null
          : Number(body.defaultShiftHours),
      defaultShiftCode: (body.defaultShiftCode ?? user.defaultShiftCode).trim() || 'None',
      authorisingManagerEmail:
        body.authorisingManagerEmail !== undefined
          ? (managerEmailParsed ?? '')
          : user.authorisingManagerEmail,
    })
    if (!updated) {
      json(res, 404, { error: 'not_found' })
      return true
    }
    json(res, 200, { user: toApiUser(updated) })
    return true
  }

  if (method === 'GET' && path === '/api/timesheets/meta/template-version') {
    const user = requireUser(getUser, res)
    if (!user) return true
    const casual = url.searchParams.get('casual') === 'true'
    try {
      const version = await getTemplateVersion(casual)
      json(res, 200, { version })
    } catch (err) {
      json(res, 500, { error: err instanceof Error ? err.message : 'template_unavailable' })
    }
    return true
  }

  const timesheetExportMatch = /^\/api\/timesheets\/(\d{4}-\d{2}-\d{2})\/export$/.exec(path)
  if (timesheetExportMatch && method === 'GET') {
    const fortnightEnding = timesheetExportMatch[1]
    const endingDate = parseFortnightParam(fortnightEnding)
    if (!endingDate || !isReasonableFortnightEnding(endingDate)) {
      json(res, 400, { error: 'invalid_fortnight' })
      return true
    }
    const user = requireUser(getUser, res)
    if (!user) return true
    const stored = getTimesheet(user.id, fortnightEnding)
    if (!stored?.outputFileName) {
      json(res, 404, { error: 'not_found' })
      return true
    }
    const filePath = outputPathForFileName(stored.outputFileName)
    if (!fs.existsSync(filePath)) {
      json(res, 404, { error: 'not_found' })
      return true
    }
    const data = fs.readFileSync(filePath)
    res.writeHead(200, {
      'Content-Type': 'application/vnd.ms-excel.sheet.macroEnabled.12',
      'Content-Disposition': `attachment; filename="${stored.outputFileName.replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
    })
    res.end(data)
    return true
  }

  const timesheetGenerateMatch = /^\/api\/timesheets\/(\d{4}-\d{2}-\d{2})\/generate$/.exec(path)
  if (timesheetGenerateMatch && method === 'POST') {
    const fortnightEnding = timesheetGenerateMatch[1]
    const endingDate = parseFortnightParam(fortnightEnding)
    if (!endingDate || !isReasonableFortnightEnding(endingDate)) {
      json(res, 400, { error: 'invalid_fortnight' })
      return true
    }
    const user = requireUser(getUser, res)
    if (!user) return true
    if (!isFortnightEndingForType(endingDate, user.casual)) {
      json(res, 404, { error: 'not_found' })
      return true
    }
    const body = await readJson<{ document?: Record<string, unknown>; ifUnmodifiedSince?: number | null }>(req)
    if (!body.document || typeof body.document !== 'object') {
      json(res, 400, { error: 'document_required' })
      return true
    }
    const normalizedDocument = normalizeTimesheetDocumentForSave(
      body.document as TimesheetDocument,
    ) as unknown as Record<string, unknown>
    const saveResult = saveTimesheet(user.id, fortnightEnding, normalizedDocument, {
      ifUnmodifiedSince: body.ifUnmodifiedSince ?? null,
      clearOutput: false,
    })
    if (!saveResult.ok) {
      json(res, 409, { error: 'conflict', serverLastUpdated: saveResult.serverLastUpdated })
      return true
    }
    try {
      const doc = normalizedDocument as TimesheetDocument
      const outputFileName = await writeTimesheetXlsm(user, fortnightEnding, {
        ...doc,
        fortnightEnding,
      })
      const payload = setTimesheetOutput(user.id, fortnightEnding, outputFileName, normalizedDocument)
      json(res, 200, {
        fortnightEnding,
        lastUpdated: payload.lastUpdated,
        outputFileName,
        hasOutput: true,
        document: payload.document,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'generate_failed'
      const status = message === 'profile_incomplete' ? 400 : 500
      json(res, status, { error: message })
    }
    return true
  }

  const timesheetMatch = /^\/api\/timesheets\/(\d{4}-\d{2}-\d{2})$/.exec(path)
  if (timesheetMatch) {
    const fortnightEnding = timesheetMatch[1]
    const endingDate = parseFortnightParam(fortnightEnding)
    if (!endingDate || !isReasonableFortnightEnding(endingDate)) {
      json(res, 400, { error: 'invalid_fortnight' })
      return true
    }

    const user = requireUser(getUser, res)
    if (!user) return true

    if (!isFortnightEndingForType(endingDate, user.casual)) {
      json(res, 404, { error: 'not_found' })
      return true
    }

    if (method === 'GET') {
      const stored = getTimesheet(user.id, fortnightEnding)
      if (!stored) {
        json(res, 404, { error: 'not_found' })
        return true
      }
      const hasOutput = Boolean(
        stored.outputFileName && fs.existsSync(outputPathForFileName(stored.outputFileName)),
      )
      json(res, 200, {
        fortnightEnding,
        lastUpdated: stored.lastUpdated,
        googleFileId: stored.googleFileId,
        outputFileName: stored.outputFileName,
        hasOutput,
        document: stored.document,
      })
      return true
    }

    if (method === 'PUT') {
      const body = await readJson<{
        document?: Record<string, unknown>
        ifUnmodifiedSince?: number | null
      }>(req)
      if (!body.document || typeof body.document !== 'object') {
        json(res, 400, { error: 'document_required' })
        return true
      }
      const normalizedDocument = normalizeTimesheetDocumentForSave(
        body.document as TimesheetDocument,
      ) as unknown as Record<string, unknown>
      const saved = saveTimesheet(user.id, fortnightEnding, normalizedDocument, {
        ifUnmodifiedSince: body.ifUnmodifiedSince ?? null,
        clearOutput: true,
      })
      if (!saved.ok) {
        json(res, 409, { error: 'conflict', serverLastUpdated: saved.serverLastUpdated })
        return true
      }
      json(res, 200, {
        fortnightEnding,
        lastUpdated: saved.payload.lastUpdated,
        googleFileId: saved.payload.googleFileId,
        outputFileName: saved.payload.outputFileName,
        hasOutput: false,
        document: saved.payload.document,
      })
      return true
    }
  }

  if (method === 'GET' && path === '/api/admin/version') {
    const admin = requireAdmin(getUser, res)
    if (!admin) return true
    json(res, 200, getBuildInfo())
    return true
  }

  if (path === '/api/admin/registration') {
    const admin = requireAdmin(getUser, res)
    if (!admin) return true
    if (method === 'GET') {
      json(res, 200, adminRegistrationPayload())
      return true
    }
    if (method === 'POST') {
      const body = await readJson<{ open?: boolean }>(req)
      if (typeof body.open !== 'boolean') {
        json(res, 400, { error: 'open_required' })
        return true
      }
      setRegistrationOpenSetting(body.open)
      json(res, 200, adminRegistrationPayload())
      return true
    }
  }

  if (method === 'GET' && path === '/api/admin/users') {
    const admin = requireAdmin(getUser, res)
    if (!admin) return true
    const search = url.searchParams.get('search')?.slice(0, 200) ?? ''
    const users = listUsers()
      .filter((u) => matchesUserSearch(u, search))
      .map((u) => {
        const api = toApiUser(u)
        return {
          id: api.id,
          email: api.email,
          name: api.name,
          employeeNumber: api.employeeNumber,
          unitStation: api.unitStation,
          casual: api.casual,
          isCountryEmployee: api.isCountryEmployee,
          profileIsComplete: api.profileIsComplete,
          hasSignature: api.hasSignature,
          isAdmin: api.isAdmin,
          isCurrentUser: api.id === admin.id,
        }
      })
    json(res, 200, { users })
    return true
  }

  const adminUserMatch = /^\/api\/admin\/users\/([^/]+)$/.exec(path)
  if (adminUserMatch && method === 'GET') {
    const admin = requireAdmin(getUser, res)
    if (!admin) return true
    const userId = adminUserMatch[1]
    if (!isValidUserId(userId)) {
      json(res, 400, { error: 'invalid_user_id' })
      return true
    }
    const target = findUserById(userId)
    if (!target) {
      json(res, 404, { error: 'not_found' })
      return true
    }
    json(res, 200, {
      user: toApiUser(target),
      timesheets: getSummariesForUser(userId),
    })
    return true
  }

  const adminSignatureMatch = /^\/api\/admin\/users\/([^/]+)\/signature$/.exec(path)
  if (adminSignatureMatch && method === 'GET') {
    const admin = requireAdmin(getUser, res)
    if (!admin) return true
    const userId = adminSignatureMatch[1]
    if (!isValidUserId(userId) || !userHasSignature(userId)) {
      json(res, 404, { error: 'not_found' })
      return true
    }
    sendPng(res, signaturePathForUser(userId))
    return true
  }

  const adminSetAdminMatch = /^\/api\/admin\/users\/([^/]+)\/admin$/.exec(path)
  if (adminSetAdminMatch && method === 'POST') {
    const admin = requireAdmin(getUser, res)
    if (!admin) return true
    const userId = adminSetAdminMatch[1]
    if (!isValidUserId(userId)) {
      json(res, 400, { error: 'invalid_user_id' })
      return true
    }
    const body = await readJson<{ isAdmin?: boolean }>(req)
    const isAdmin = Boolean(body.isAdmin)
    const target = findUserById(userId)
    if (!target) {
      json(res, 404, { error: 'not_found' })
      return true
    }
    if (userId === admin.id && !isAdmin) {
      json(res, 400, { error: 'cannot_remove_own_admin' })
      return true
    }
    if (!isAdmin && target.isAdmin && countAdmins() <= 1) {
      json(res, 400, { error: 'last_admin' })
      return true
    }
    setUserAdminById(userId, isAdmin)
    json(res, 200, { ok: true })
    return true
  }

  if (adminUserMatch && method === 'DELETE') {
    const admin = requireAdmin(getUser, res)
    if (!admin) return true
    const userId = adminUserMatch[1]
    if (!isValidUserId(userId)) {
      json(res, 400, { error: 'invalid_user_id' })
      return true
    }
    if (userId === admin.id) {
      json(res, 400, { error: 'cannot_delete_self' })
      return true
    }
    const target = findUserById(userId)
    if (!target) {
      json(res, 404, { error: 'not_found' })
      return true
    }
    if (target.isAdmin && countAdmins() <= 1) {
      json(res, 400, { error: 'last_admin' })
      return true
    }
    deleteSignature(userId)
    deleteUserAccount(userId)
    json(res, 200, { ok: true })
    return true
  }

  if (method === 'GET' && path === '/api/admin/timesheets/report') {
    const admin = requireAdmin(getUser, res)
    if (!admin) return true
    const param = url.searchParams.get('fortnightEnding')
    const endingDate = param ? parseFortnightParam(param) : getCurrentFortnightEnding(false)
    if (!endingDate || !isReasonableFortnightEnding(endingDate)) {
      json(res, 400, { error: 'invalid_fortnight' })
      return true
    }
    const fortnightEnding = toFortnightParam(endingDate)
    const summaries = getSummariesForFortnight(fortnightEnding)
    const users = listUsers()
    const rows = users.map((u) => {
      const api = toApiUser(u)
      const applies = isFortnightEndingForType(endingDate, u.casual)
      return {
        userId: u.id,
        email: u.email,
        name: u.name,
        employeeNumber: u.employeeNumber,
        unitStation: u.unitStation,
        casual: u.casual,
        isCountryEmployee: u.isCountryEmployee,
        profileIsComplete: api.profileIsComplete,
        appliesToSelectedFortnight: applies,
        timesheet: summaries.get(u.id) ?? null,
      }
    })
    const applicable = rows.filter((r) => r.appliesToSelectedFortnight)
    json(res, 200, {
      fortnightEnding,
      fortnightOptions: getAllFortnightDates().map(toFortnightParam),
      currentPermanentFortnight: toFortnightParam(getCurrentFortnightEnding(false)),
      currentCasualFortnight: toFortnightParam(getCurrentFortnightEnding(true)),
      totalUsers: applicable.length,
      incompleteProfiles: applicable.filter((r) => !r.profileIsComplete).length,
      withTimesheet: applicable.filter((r) => r.timesheet).length,
      uploaded: applicable.filter((r) => r.timesheet?.isUploaded).length,
      rows,
    })
    return true
  }

  const adminTimesheetMatch = /^\/api\/admin\/users\/([^/]+)\/timesheets\/(\d{4}-\d{2}-\d{2})$/.exec(path)
  if (adminTimesheetMatch && method === 'GET') {
    const admin = requireAdmin(getUser, res)
    if (!admin) return true
    const userId = adminTimesheetMatch[1]
    const fortnightEnding = adminTimesheetMatch[2]
    const endingDate = parseFortnightParam(fortnightEnding)
    if (!isValidUserId(userId) || !endingDate || !isReasonableFortnightEnding(endingDate)) {
      json(res, 400, { error: 'invalid_request' })
      return true
    }
    const target = findUserById(userId)
    if (!target) {
      json(res, 404, { error: 'not_found' })
      return true
    }
    if (!isFortnightEndingForType(endingDate, target.casual)) {
      json(res, 404, { error: 'not_found' })
      return true
    }
    const stored = getTimesheet(userId, fortnightEnding)
    if (!stored) {
      json(res, 404, { error: 'not_found' })
      return true
    }
    json(res, 200, {
      email: target.email,
      user: toApiUser(target),
      fortnightEnding,
      lastUpdated: stored.lastUpdated,
      googleFileId: stored.googleFileId,
      document: stored.document,
    })
    return true
  }

  if (method === 'POST' && path === '/api/support') {
    const user = requireUser(getUser, res)
    if (!user) return true
    const body = await readJson<{ subject?: string; message?: string }>(req)
    const subject = body.subject?.trim() ?? ''
    const message = body.message?.trim() ?? ''
    if (subject.length < 3 || subject.length > 200) {
      json(res, 400, { error: 'invalid_subject' })
      return true
    }
    if (message.length < 10 || message.length > 5000) {
      json(res, 400, { error: 'invalid_message' })
      return true
    }
    const created = createSupportRequest(user.id, subject, message)
    const withUser = findSupportRequest(created.id)
    if (withUser) {
      try {
        await notifyAdminsOfSupportRequest(withUser)
      } catch (err) {
        tryWriteErrorLog({
          level: 'Warning',
          category: 'support',
          message: 'Support request saved but admin email failed',
          exception: err instanceof Error ? err.stack ?? err.message : String(err),
          userId: user.id,
        })
      }
    }
    json(res, 201, { ok: true, id: created.id })
    return true
  }

  if (method === 'GET' && path === '/api/admin/support') {
    const admin = requireAdmin(getUser, res)
    if (!admin) return true
    json(res, 200, { requests: listSupportRequests() })
    return true
  }

  const adminSupportMatch = /^\/api\/admin\/support\/([^/]+)$/.exec(path)
  if (adminSupportMatch && method === 'POST') {
    const admin = requireAdmin(getUser, res)
    if (!admin) return true
    const requestId = adminSupportMatch[1]
    const body = await readJson<{ status?: string }>(req)
    if (body.status !== 'open' && body.status !== 'closed') {
      json(res, 400, { error: 'invalid_status' })
      return true
    }
    const updated = setSupportRequestStatus(requestId, body.status as SupportRequestStatus)
    if (!updated) {
      json(res, 404, { error: 'not_found' })
      return true
    }
    json(res, 200, { request: updated })
    return true
  }

  if (method === 'POST' && path === '/api/admin/email/test') {
    const admin = requireAdmin(getUser, res)
    if (!admin) return true
    const status = emailConfigStatus()
    if (!status.configured) {
      json(res, 503, { error: 'email_not_configured' })
      return true
    }
    const body = await readJson<{ to?: string }>(req)
    const to = (body.to?.trim() || admin.email).toLowerCase()
    if (!to.includes('@')) {
      json(res, 400, { error: 'invalid_to' })
      return true
    }
    try {
      const { id } = await deliverEmail(
        {
          to,
          subject: 'Crib Sheets — test email',
          text: 'If you received this, Resend is configured correctly for Crib Sheets.',
          html: '<p>If you received this, Resend is configured correctly for <strong>Crib Sheets</strong>.</p>',
        },
        { kind: 'admin_test', userId: admin.id },
      )
      json(res, 200, { ok: true, id, to })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      json(res, 502, { error: 'send_failed', message })
    }
    return true
  }

  const adminEmailLogResendMatch = /^\/api\/admin\/email\/logs\/(\d+)\/resend$/.exec(path)
  if (adminEmailLogResendMatch && method === 'POST') {
    const admin = requireAdmin(getUser, res)
    if (!admin) return true
    const logId = Number(adminEmailLogResendMatch[1])
    if (!Number.isInteger(logId) || logId < 1) {
      json(res, 400, { error: 'invalid_log_id' })
      return true
    }
    try {
      const { id } = await resendEmailFromLog(logId)
      json(res, 200, { ok: true, id })
    } catch (err) {
      if (err instanceof ResendEmailLogError) {
        json(res, 400, { error: err.code })
        return true
      }
      const message = err instanceof Error ? err.message : String(err)
      json(res, 502, { error: 'send_failed', message })
    }
    return true
  }

  if (method === 'GET' && path === '/api/admin/logs') {
    const admin = requireAdmin(getUser, res)
    if (!admin) return true
    const { migrationRunUtc, migrationResults } = getMigrationStatus()
    json(res, 200, {
      loggingAvailable: isLoggingAvailable(),
      migrationRunUtc,
      migrationResults,
      entries: getRecentErrorLogs(100),
      email: emailConfigStatus(),
      e2eTestHooksEnabled: e2eTestHooksEnabled(),
      emailLogs: listRecentEmailLogs(100),
    })
    return true
  }

  return false
}

export function logRequestError(
  err: unknown,
  req: http.IncomingMessage,
  userId: string | null,
): void {
  const message = err instanceof Error ? err.message : String(err)
  const exception = err instanceof Error ? err.stack ?? err.message : String(err)
  tryWriteErrorLog({
    level: 'Error',
    category: 'api',
    message,
    exception,
    requestPath: req.url ?? undefined,
    userId,
  })
}
