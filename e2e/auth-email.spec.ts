import { expect, test } from '@playwright/test'
import {
  clearEmailLogs,
  expectVerifyEmailLog,
  extractToken,
  fetchEmailLogs,
  findVerifyEmailLog,
  uniqueE2eEmail,
} from './helpers/email-logs'

test.describe('auth emails (log-only)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    await clearEmailLogs(request)
  })

  test('registration logs verify email without sending', async ({ request, baseURL }) => {
    const email = uniqueE2eEmail()
    const registerRes = await request.post('/api/auth/register', {
      data: { name: 'E2E User', email, password: 'password123' },
    })
    expect(registerRes.status()).toBe(201)
    const registerBody = await registerRes.json()
    expect(registerBody).toMatchObject({ needsEmailVerification: true })

    const logs = await fetchEmailLogs(request)
    const verifyLog = findVerifyEmailLog(logs, email)
    expect(verifyLog).toBeTruthy()
    expectVerifyEmailLog(verifyLog!, { email, appOrigin: baseURL! })

    const token = extractToken(verifyLog!.textBody, '/verify-email')
    const verifyRes = await request.get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
    expect(verifyRes.ok()).toBeTruthy()

    const loginRes = await request.post('/api/auth/login', {
      data: { email, password: 'password123' },
    })
    expect(loginRes.ok()).toBeTruthy()
  })

  test('forgot password logs reset email without sending', async ({ request }) => {
    const email = uniqueE2eEmail('e2e-reset')
    await request.post('/api/auth/register', {
      data: { name: 'Reset User', email, password: 'password123' },
    })
    const logsAfterRegister = await fetchEmailLogs(request)
    const verifyLog = findVerifyEmailLog(logsAfterRegister, email)
    const verifyToken = extractToken(verifyLog!.textBody, '/verify-email')
    await request.get(`/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`)

    await clearEmailLogs(request)

    const forgotRes = await request.post('/api/auth/forgot-password', { data: { email } })
    expect(forgotRes.ok()).toBeTruthy()

    const logs = await fetchEmailLogs(request)
    const resetLog = logs.find((l) => l.kind === 'password_reset' && l.toEmail === email.toLowerCase())
    expect(resetLog).toBeTruthy()
    expect(resetLog!.status).toBe('logged_only')
    expect(resetLog!.subject).toMatch(/reset/i)
    expect(resetLog!.textBody).toContain('/reset-password?token=')

    const token = extractToken(resetLog!.textBody, '/reset-password')
    const resetRes = await request.post('/api/auth/reset-password', {
      data: { token, password: 'newpassword456' },
    })
    expect(resetRes.ok()).toBeTruthy()

    const oldLogin = await request.post('/api/auth/login', {
      data: { email, password: 'password123' },
    })
    expect(oldLogin.status()).toBe(401)

    const newLogin = await request.post('/api/auth/login', {
      data: { email, password: 'newpassword456' },
    })
    expect(newLogin.ok()).toBeTruthy()
  })
})
