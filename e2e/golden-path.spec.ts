import { test } from '@playwright/test'
import { loginViaUi, registerViaUi, verifyEmailViaUi } from './helpers/ui-auth'
import { completeProfileViaUi } from './helpers/ui-profile'
import { clearEmailLogs, uniqueE2eEmail } from './helpers/email-logs'

const DEFAULT_PASSWORD = 'password123'

test.describe('golden path', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    await clearEmailLogs(request)
  })

  test('sign up, verify, log in, and complete profile', async ({ page, request, baseURL }) => {
    const email = uniqueE2eEmail('e2e-golden')
    const name = 'Golden Path User'

    await registerViaUi(page, request, {
      name,
      email,
      password: DEFAULT_PASSWORD,
      appOrigin: baseURL!,
    })

    await verifyEmailViaUi(page, request, email)
    await loginViaUi(page, { email, password: DEFAULT_PASSWORD })
    await completeProfileViaUi(page, { name })
  })
})
