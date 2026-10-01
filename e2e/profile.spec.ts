import { expect, test } from '@playwright/test'
import { loginViaApi, registerVerifiedUser } from './helpers/auth'
import { clearEmailLogs } from './helpers/email-logs'
import { completeProfileViaUi } from './helpers/ui-profile'

test.describe('profile', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    await clearEmailLogs(request)
  })

  test('completes required profile fields and opens the timesheet', async ({ page, request }) => {
    const { email, password } = await registerVerifiedUser(request, {
      name: 'Profile UI User',
      emailPrefix: 'e2e-profile-ui',
    })

    await loginViaApi(page, { email, password })
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()

    await completeProfileViaUi(page, { name: 'Profile UI User' })
  })
})
