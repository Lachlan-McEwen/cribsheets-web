import type http from 'node:http'
import { deleteUserAccount, listUsers, setRegistrationOpenSetting } from './db.js'
import { clearEmailLogs, listRecentEmailLogs } from './emailLog.js'
import { json } from './httpUtil.js'
import { deleteSignature } from './signatures.js'

const E2E_USER_EMAIL_RE = /^e2e-.*@example\.com$/i

export function purgeE2eFixtureUsers(): number {
  let removed = 0
  for (const user of listUsers()) {
    if (!E2E_USER_EMAIL_RE.test(user.email)) continue
    deleteSignature(user.id)
    deleteUserAccount(user.id)
    removed += 1
  }
  return removed
}

export function e2eTestHooksEnabled(): boolean {
  return process.env.E2E_TEST_HOOKS === 'true' && Boolean(process.env.E2E_TEST_SECRET?.trim())
}

function e2eSecretOk(req: http.IncomingMessage): boolean {
  const expected = process.env.E2E_TEST_SECRET?.trim()
  if (!expected) return false
  const header = req.headers['x-e2e-secret']
  const value = Array.isArray(header) ? header[0] : header
  return value === expected
}

export function tryHandleTestHooks(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  path: string,
  method: string,
): boolean {
  if (!e2eTestHooksEnabled()) return false
  if (!path.startsWith('/api/test/')) return false
  if (!e2eSecretOk(req)) {
    json(res, 404, { error: 'not_found' })
    return true
  }

  if (method === 'GET' && path === '/api/test/email-logs') {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '50', 10)
    json(res, 200, { logs: listRecentEmailLogs(limit) })
    return true
  }

  if (method === 'DELETE' && path === '/api/test/email-logs') {
    clearEmailLogs()
    json(res, 200, { ok: true })
    return true
  }

  if (method === 'DELETE' && path === '/api/test/e2e-users') {
    const removed = purgeE2eFixtureUsers()
    clearEmailLogs()
    json(res, 200, { ok: true, removed })
    return true
  }

  if (method === 'POST' && path === '/api/test/bootstrap') {
    setRegistrationOpenSetting(true)
    json(res, 200, { ok: true, registrationOpen: true })
    return true
  }

  json(res, 404, { error: 'not_found' })
  return true
}
