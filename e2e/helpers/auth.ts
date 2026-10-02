import { expect, type APIRequestContext, type Page } from '@playwright/test'
import {
  extractToken,
  fetchEmailLogs,
  findVerifyEmailLog,
  uniqueE2eEmail,
} from './email-logs'

export async function registerUnverifiedUser(
  request: APIRequestContext,
  opts?: { name?: string; email?: string; password?: string; emailPrefix?: string },
) {
  const email = opts?.email ?? uniqueE2eEmail(opts?.emailPrefix ?? 'e2e')
  const password = opts?.password ?? 'password123'
  const name = opts?.name ?? 'E2E User'
  const registerRes = await request.post('/api/auth/register', {
    data: { name, email, password },
  })
  expect(registerRes.status()).toBe(201)
  const body = await registerRes.json()
  expect(body).toMatchObject({ needsEmailVerification: true })
  return { email, password, name }
}

export async function getVerifyEmailToken(request: APIRequestContext, email: string): Promise<string> {
  const logs = await fetchEmailLogs(request)
  const verifyLog = findVerifyEmailLog(logs, email)
  expect(verifyLog, `no verify_email log for ${email}`).toBeTruthy()
  return extractToken(verifyLog!.textBody, '/verify-email')
}

export async function registerVerifiedUser(
  request: APIRequestContext,
  opts?: { name?: string; email?: string; password?: string; emailPrefix?: string },
) {
  const { email, password, name } = await registerUnverifiedUser(request, opts)
  const token = await getVerifyEmailToken(request, email)
  const verifyRes = await request.get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
  expect(verifyRes.ok()).toBeTruthy()
  return { email, password, name }
}

/** Sets session cookie on the browser context (no login UI). */
export async function loginViaApi(page: Page, opts: { email: string; password: string }) {
  const res = await page.request.post('/api/auth/login', {
    data: { email: opts.email, password: opts.password },
  })
  expect(res.ok()).toBeTruthy()
}

const MIN_SIGNATURE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

export async function completeProfileViaApi(
  page: Page,
  opts: {
    name: string
    employeeNumber?: string
    unitStation?: string
    authorisingManagerEmail?: string
  },
) {
  const res = await page.request.put('/api/profile', {
    data: {
      name: opts.name,
      employeeNumber: opts.employeeNumber ?? '1002454',
      unitStation: opts.unitStation ?? 'BARMERA',
      signatureDataUrl: MIN_SIGNATURE_PNG,
      ...(opts.authorisingManagerEmail !== undefined
        ? { authorisingManagerEmail: opts.authorisingManagerEmail }
        : {}),
    },
  })
  expect(res.ok()).toBeTruthy()
  const meRes = await page.request.get('/api/auth/me')
  expect(meRes.ok()).toBeTruthy()
  const me = (await meRes.json()) as { user: { profileIsComplete: boolean } }
  expect(me.user.profileIsComplete).toBe(true)
}

/** Verified user with complete profile; session on `page` (no auth/profile UI). */
export async function seedUserForTimesheetUi(
  page: Page,
  request: APIRequestContext,
  opts?: { name?: string; emailPrefix?: string },
) {
  const name = opts?.name ?? 'Timesheet UI User'
  const { email, password } = await registerVerifiedUser(request, {
    name,
    emailPrefix: opts?.emailPrefix ?? 'e2e-timesheet-ui',
  })
  await loginViaApi(page, { email, password })
  await completeProfileViaApi(page, { name })
  return { email, password, name }
}
