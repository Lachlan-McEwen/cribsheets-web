import http from 'node:http'
import { parseCookies, sessionClearCookie, sessionSetCookie, SESSION_COOKIE } from './auth.js'
import { ensureBootstrapAdmin } from './bootstrapAdmin.js'
import { ensureBootstrapDevUser } from './bootstrapDevUser.js'
import {
  createSession,
  deleteSession,
  findUserByEmail,
  getDb,
  setRegistrationOpenSetting,
  userForSession,
  verifyPassword,
} from './db.js'
import { setLoggingAvailable, setMigrationResults } from './errorLog.js'
import { emailConfigStatus } from './email.js'
import { loadEnvFiles } from './env.js'
import {
  handleChangePassword,
  handleForgotPassword,
  handleResendVerification,
  handleResetPassword,
  handleVerifyEmail,
} from './authHandlers.js'
import { logRequestError, tryHandleApi } from './handlers.js'
import { legacyApiEnabled } from './legacyApiAuth.js'
import { tryHandleLegacyApi } from './legacyHandlers.js'
import { json } from './httpUtil.js'
import { completeRegistration, registrationAllowed, registerUser, validateRegisterInput } from './register.js'
import { tryHandleTestHooks } from './testHooks.js'
import { hasStaticUi, trySendStatic } from './static.js'
import { toApiUser } from './userApi.js'

loadEnvFiles()
ensureBootstrapAdmin()
ensureBootstrapDevUser()

getDb()
const allowRegistration = process.env.ALLOW_REGISTRATION?.trim().toLowerCase()
if (allowRegistration === 'true') {
  setRegistrationOpenSetting(true)
} else if (allowRegistration === 'false') {
  setRegistrationOpenSetting(false)
}
setLoggingAvailable(true)
setMigrationResults([
  { migrationId: 'users', status: 'Ready', message: 'Users and sessions tables available.', exception: null },
  { migrationId: 'timesheets', status: 'Ready', message: 'Timesheet storage available.', exception: null },
  { migrationId: 'app_error_logs', status: 'Ready', message: 'Application error log available.', exception: null },
  { migrationId: 'email_logs', status: 'Ready', message: 'Outbound email log available.', exception: null },
  { migrationId: 'auth_tokens', status: 'Ready', message: 'Auth email tokens available.', exception: null },
  { migrationId: 'support_requests', status: 'Ready', message: 'Support requests available.', exception: null },
])

const PORT = Number(process.env.PORT) || 3849
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN?.trim()

function applyCors(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (!CLIENT_ORIGIN) return false
  res.setHeader('Access-Control-Allow-Origin', CLIENT_ORIGIN)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Legacy-User-Id')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return true
  }
  return false
}

async function readJson<T>(req: http.IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text) return {} as T
  return JSON.parse(text) as T
}

function currentUser(req: http.IncomingMessage) {
  const sessionId = parseCookies(req.headers.cookie)[SESSION_COOKIE]
  if (!sessionId) return null
  return userForSession(sessionId)
}

const server = http.createServer(async (req, res) => {
  if (applyCors(req, res)) return

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const path = url.pathname
  const getUser = () => currentUser(req)

  try {
    if (req.method === 'GET' && path === '/api/health') {
      json(res, 200, {
        ok: true,
        staticUi: hasStaticUi(),
        email: emailConfigStatus(),
        legacyApi: legacyApiEnabled(),
      })
      return
    }

    if (req.method === 'GET' && path === '/api/auth/me') {
      const user = getUser()
      if (!user) {
        json(res, 401, { error: 'not_authenticated' })
        return
      }
      json(res, 200, { user: toApiUser(user) })
      return
    }

    if (req.method === 'POST' && path === '/api/auth/login') {
      const body = await readJson<{ email?: string; password?: string }>(req)
      const email = body.email?.trim()
      const password = body.password ?? ''
      if (!email || !password) {
        json(res, 400, { error: 'email_and_password_required' })
        return
      }
      const row = findUserByEmail(email)
      if (!row || !verifyPassword(password, row.password_hash)) {
        json(res, 401, { error: 'invalid_credentials' })
        return
      }
      if (row.emailVerifiedAt == null) {
        json(res, 403, { error: 'email_not_verified' })
        return
      }
      const session = createSession(row.id)
      const user = userForSession(session.id)
      json(res, 200, { user: user ? toApiUser(user) : null }, { 'Set-Cookie': sessionSetCookie(session.id) })
      return
    }

    if (req.method === 'GET' && path === '/api/auth/registration') {
      json(res, 200, { open: registrationAllowed() })
      return
    }

    if (req.method === 'POST' && path === '/api/auth/register') {
      const body = await readJson<{ email?: string; password?: string; name?: string }>(req)
      const validated = validateRegisterInput(body)
      if (typeof validated === 'string') {
        json(res, 400, { error: validated })
        return
      }
      const result = registerUser(validated)
      if (!result.ok) {
        const status =
          result.error === 'registration_closed' || result.error === 'registration_full' ? 403 : 409
        json(res, status, { error: result.error })
        return
      }
      const mailed = await completeRegistration(result.userId, result.email)
      if (!mailed.ok) {
        json(res, 503, { error: mailed.error })
        return
      }
      json(res, 201, { ok: true, needsEmailVerification: true })
      return
    }

    if (req.method === 'POST' && path === '/api/auth/forgot-password') {
      await handleForgotPassword(req, res)
      return
    }

    if (req.method === 'POST' && path === '/api/auth/reset-password') {
      await handleResetPassword(req, res)
      return
    }

    if (req.method === 'GET' && path === '/api/auth/verify-email') {
      await handleVerifyEmail(req, res)
      return
    }

    if (req.method === 'POST' && path === '/api/auth/resend-verification') {
      await handleResendVerification(req, res)
      return
    }

    if (req.method === 'POST' && path === '/api/auth/change-password') {
      const user = getUser()
      if (!user) {
        json(res, 401, { error: 'not_authenticated' })
        return
      }
      await handleChangePassword(req, res, user)
      return
    }

    if (req.method === 'POST' && path === '/api/auth/logout') {
      const sessionId = parseCookies(req.headers.cookie)[SESSION_COOKIE]
      if (sessionId) deleteSession(sessionId)
      json(res, 200, { ok: true }, { 'Set-Cookie': sessionClearCookie() })
      return
    }

    if (tryHandleTestHooks(req, res, path, req.method ?? 'GET')) return

    if (await tryHandleLegacyApi(req, res, url)) return

    if (await tryHandleApi(req, res, url, getUser)) return

    if (trySendStatic(req, res)) return

    json(res, 404, { error: 'not_found' })
  } catch (err) {
    console.error(err)
    const user = getUser()
    logRequestError(err, req, user?.id ?? null)
    json(res, 500, { error: 'internal_error' })
  }
})

server.listen(PORT, () => {
  console.log(`CribSheets API listening on http://localhost:${PORT}`)
})
