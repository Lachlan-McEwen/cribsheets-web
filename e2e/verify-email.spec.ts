import { test } from '@playwright/test'
import { registerUnverifiedUser } from './helpers/auth'
import { verifyEmailViaUi } from './helpers/ui-auth'
import { clearEmailLogs } from './helpers/email-logs'

test.describe('verify email', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    await clearEmailLogs(request)
  })

  test('verification link shows success in the browser', async ({ page, request }) => {
    const { email } = await registerUnverifiedUser(request, {
      name: 'Verify UI User',
      emailPrefix: 'e2e-verify-ui',
    })
    await verifyEmailViaUi(page, request, email)
  })
})
