import { test } from '@playwright/test'
import { registerViaUi } from './helpers/ui-auth'
import { clearEmailLogs, uniqueE2eEmail } from './helpers/email-logs'

test.describe('register', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    await clearEmailLogs(request)
  })

  test('shows check-email after sign up and logs correct verify email', async ({ page, request, baseURL }) => {
    const email = uniqueE2eEmail('e2e-ui')
    await registerViaUi(page, request, {
      name: 'E2E UI User',
      email,
      password: 'password123',
      appOrigin: baseURL!,
    })
  })
})
