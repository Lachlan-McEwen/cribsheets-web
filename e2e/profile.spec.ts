import { expect, test } from '@playwright/test'
import { clearEmailLogs } from './helpers/email-logs'
import { completeProfileViaApi, loginViaApi, registerVerifiedUser } from './helpers/auth'
import {
  completeProfileViaUi,
  drawSignatureStroke,
  fetchProfileSignatureBytes,
} from './helpers/ui-profile'

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

  test('updates signature on an already saved profile', async ({ page, request }) => {
    const { email, password } = await registerVerifiedUser(request, {
      name: 'Signature Edit User',
      emailPrefix: 'e2e-profile-sig-edit',
    })
    await loginViaApi(page, { email, password })
    await completeProfileViaApi(page, { name: 'Signature Edit User' })

    const before = await fetchProfileSignatureBytes(page)

    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
    await expect(page.getByRole('img', { name: 'Current signature' })).toBeVisible()

    await page.getByRole('button', { name: 'Edit signature' }).click()
    await drawSignatureStroke(page, { x: 60, y: 40 }, { x: 420, y: 180 })
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('img', { name: 'Current signature' })).toBeVisible()

    await page.getByRole('button', { name: 'Save profile' }).click()
    await expect(page.getByText('Profile saved.')).toBeVisible({ timeout: 15_000 })

    const after = await fetchProfileSignatureBytes(page)
    expect(after.length).toBeGreaterThan(before.length)
    expect(Buffer.compare(before, after)).not.toBe(0)

    await expect(page.locator('img.profile-signature-preview')).toHaveAttribute(
      'src',
      /\/api\/profile\/signature\?v=\d+/,
    )
  })
})
