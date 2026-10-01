import { expect, type APIRequestContext } from '@playwright/test'

export const E2E_SECRET = process.env.E2E_TEST_SECRET ?? 'playwright-e2e-secret'

export type EmailLog = {
  kind: string
  toEmail: string
  subject: string
  status: string
  textBody: string
  htmlBody: string | null
}

export function uniqueE2eEmail(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}@example.com`
}

export async function clearEmailLogs(request: APIRequestContext) {
  await request.delete('/api/test/email-logs', {
    headers: { 'X-E2E-Secret': E2E_SECRET },
  })
}

export async function fetchEmailLogs(request: APIRequestContext, limit = 20): Promise<EmailLog[]> {
  const res = await request.get(`/api/test/email-logs?limit=${limit}`, {
    headers: { 'X-E2E-Secret': E2E_SECRET },
  })
  expect(res.ok()).toBeTruthy()
  const body = (await res.json()) as { logs: EmailLog[] }
  return body.logs
}

export function extractToken(text: string, path: string): string {
  const re = new RegExp(`${path}\\?token=([^\\s)]+)`)
  const match = re.exec(text)
  expect(match, `expected ${path} link in email body`).toBeTruthy()
  return decodeURIComponent(match![1])
}

export function findVerifyEmailLog(logs: EmailLog[], email: string): EmailLog | undefined {
  return logs.find((l) => l.kind === 'verify_email' && l.toEmail === email.toLowerCase())
}

/** Matches copy in api/server/authEmail.ts */
export function expectVerifyEmailLog(log: EmailLog, opts: { email: string; appOrigin: string }) {
  const { email, appOrigin } = opts
  const normalizedEmail = email.trim().toLowerCase()
  expect(log.kind).toBe('verify_email')
  expect(log.toEmail).toBe(normalizedEmail)
  expect(log.status).toBe('logged_only')
  expect(log.subject).toBe('Verify your Crib Sheets email')
  expect(log.textBody).toContain('Welcome to Crib Sheets')
  expect(log.textBody).toContain('Verify your email by opening this link')
  expect(log.textBody).toContain(`${appOrigin}/verify-email?token=`)
  expect(log.textBody).toContain('If you did not create an account, you can ignore this email.')
  expect(log.htmlBody).toBeTruthy()
  expect(log.htmlBody).toContain('Welcome to Crib Sheets')
  expect(log.htmlBody).toContain(`${appOrigin}/verify-email?token=`)
  expect(log.htmlBody).toContain('Verify your email address')
}
