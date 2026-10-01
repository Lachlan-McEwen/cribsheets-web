import { expect, test } from '@playwright/test'

const E2E_SECRET = process.env.E2E_TEST_SECRET ?? 'playwright-e2e-secret'

type EmailLog = {
  kind: string
  toEmail: string
  subject: string
  status: string
  textBody: string
}

async function clearEmailLogs(request: import('@playwright/test').APIRequestContext) {
  await request.delete('/api/test/email-logs', {
    headers: { 'X-E2E-Secret': E2E_SECRET },
  })
}

async function fetchEmailLogs(request: import('@playwright/test').APIRequestContext): Promise<EmailLog[]> {
  const res = await request.get('/api/test/email-logs?limit=20', {
    headers: { 'X-E2E-Secret': E2E_SECRET },
  })
  expect(res.ok()).toBeTruthy()
  const body = (await res.json()) as { logs: EmailLog[] }
  return body.logs
}

function extractToken(text: string, path: string): string {
  const re = new RegExp(`${path}\\?token=([^\\s)]+)`)
  const match = re.exec(text)
  expect(match, `expected ${path} link in email body`).toBeTruthy()
  return decodeURIComponent(match![1])
}

test.describe('auth emails (log-only)', () => {
  test.beforeEach(async ({ request }) => {
    await clearEmailLogs(request)
  })

  test('registration logs verify email without sending', async ({ request }) => {
    const email = `e2e-${Date.now()}@example.com`
    const registerRes = await request.post('/api/auth/register', {
      data: { name: 'E2E User', email, password: 'password123' },
    })
    expect(registerRes.status()).toBe(201)
    const registerBody = await registerRes.json()
    expect(registerBody).toMatchObject({ needsEmailVerification: true })

    const logs = await fetchEmailLogs(request)
    const verifyLog = logs.find((l) => l.kind === 'verify_email' && l.toEmail === email)
    expect(verifyLog).toBeTruthy()
    expect(verifyLog!.status).toBe('logged_only')
    expect(verifyLog!.subject).toMatch(/verify/i)
    expect(verifyLog!.textBody).toContain('/verify-email?token=')

    const token = extractToken(verifyLog!.textBody, '/verify-email')
    const verifyRes = await request.get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
    expect(verifyRes.ok()).toBeTruthy()

    const loginRes = await request.post('/api/auth/login', {
      data: { email, password: 'password123' },
    })
    expect(loginRes.ok()).toBeTruthy()
  })

  test('forgot password logs reset email without sending', async ({ request }) => {
    const email = `e2e-reset-${Date.now()}@example.com`
    await request.post('/api/auth/register', {
      data: { name: 'Reset User', email, password: 'password123' },
    })
    const logsAfterRegister = await fetchEmailLogs(request)
    const verifyLog = logsAfterRegister.find((l) => l.kind === 'verify_email')
    const verifyToken = extractToken(verifyLog!.textBody, '/verify-email')
    await request.get(`/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`)

    await clearEmailLogs(request)

    const forgotRes = await request.post('/api/auth/forgot-password', { data: { email } })
    expect(forgotRes.ok()).toBeTruthy()

    const logs = await fetchEmailLogs(request)
    const resetLog = logs.find((l) => l.kind === 'password_reset' && l.toEmail === email)
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
