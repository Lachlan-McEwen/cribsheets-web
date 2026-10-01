import { test, expect } from '@playwright/test'
import { registerVerifiedUser } from './helpers/auth'
import { clearEmailLogs } from './helpers/email-logs'
import { loginViaUi } from './helpers/ui-auth'

test.describe('login', () => {
  test('shows the login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible()
  })

  test('redirects unauthenticated users from home to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
  })

  test.describe('with seeded user', () => {
    test.beforeEach(async ({ request }) => {
      await clearEmailLogs(request)
    })

    test('logs in a verified user in the browser', async ({ page, request }) => {
      const { email, password } = await registerVerifiedUser(request, {
        name: 'Login UI User',
        emailPrefix: 'e2e-login-ui',
      })
      await loginViaUi(page, { email, password })
    })
  })
})
