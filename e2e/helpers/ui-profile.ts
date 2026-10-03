import { expect, type Page } from '@playwright/test'

/** Offset from the canvas top-left in CSS pixels (matches pointer hit-testing). */
export async function drawSignatureStroke(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const canvas = page.locator('#signatureCanvas')
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  expect(box).toBeTruthy()
  await page.mouse.move(box!.x + from.x, box!.y + from.y)
  await page.mouse.down()
  await page.mouse.move(box!.x + to.x, box!.y + to.y)
  await page.mouse.up()
}

export async function fetchProfileSignatureBytes(page: Page): Promise<Buffer> {
  const res = await page.request.get('/api/profile/signature')
  expect(res.ok()).toBeTruthy()
  return Buffer.from(await res.body())
}

export type CompleteProfileOpts = {
  name?: string
  employeeNumber?: string
  unitStation?: string
  authorisingManagerEmail?: string
}

export async function completeProfileViaUi(page: Page, opts: CompleteProfileOpts = {}) {
  const name = opts.name ?? 'E2E Profile User'
  const employeeNumber = opts.employeeNumber ?? '1002454'
  const unitStation = opts.unitStation ?? 'BARMERA'
  const authorisingManagerEmail = opts.authorisingManagerEmail

  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
  await expect(page.locator('select[name="unitStation"] option[value="BARMERA"]')).toHaveCount(1, {
    timeout: 15_000,
  })

  await page.locator('input[name="name"]').fill(name)
  await page.locator('input[name="employeeNumber"]').fill(employeeNumber)
  await page.locator('select[name="unitStation"]').selectOption(unitStation)
  if (authorisingManagerEmail) {
    await page.locator('input[name="authorisingManagerEmail"]').fill(authorisingManagerEmail)
  }

  await page.getByRole('button', { name: 'Edit signature' }).click()
  await drawSignatureStroke(page, { x: 40, y: 40 }, { x: 200, y: 120 })

  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByText('Profile saved.')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('link', { name: 'Back to timesheets' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Timesheet' })).toBeVisible()
}
