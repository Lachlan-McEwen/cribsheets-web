import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { getVerifyEmailToken } from './auth'
import { expectVerifyEmailLog, fetchEmailLogs, findVerifyEmailLog } from './email-logs'

export async function registerViaUi(
  page: Page,
  request: APIRequestContext,
  opts: { name: string; email: string; password: string; appOrigin: string },
) {
  const { name, email, password, appOrigin } = opts

  await page.goto('/register')
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Register' }).click()

  await expect(page).toHaveURL(`/check-email?email=${encodeURIComponent(email)}`)
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  await expect(
    page.getByText(`We sent a verification link to ${email}. Open it to activate your account, then log in.`),
  ).toBeVisible()

  const logs = await fetchEmailLogs(request)
  const verifyLog = findVerifyEmailLog(logs, email)
  expect(verifyLog).toBeTruthy()
  expectVerifyEmailLog(verifyLog!, { email, appOrigin })
}

export async function verifyEmailViaUi(page: Page, request: APIRequestContext, email: string) {
  const token = await getVerifyEmailToken(request, email)
  await page.goto(`/verify-email?token=${encodeURIComponent(token)}`)

  await expect(page.getByRole('heading', { name: 'Email verified' })).toBeVisible()
  await expect(page.getByText('You can now log in.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
}

export async function loginViaUi(page: Page, opts: { email: string; password: string }) {
  const { email, password } = opts

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()

  await expect(page).not.toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
  await expect(page).toHaveURL(/\/profile/)
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
}
