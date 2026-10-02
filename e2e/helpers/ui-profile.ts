import { expect, type Page } from '@playwright/test'

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
  const canvas = page.locator('#signatureCanvas')
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  expect(box).toBeTruthy()
  await page.mouse.move(box!.x + 40, box!.y + 40)
  await page.mouse.down()
  await page.mouse.move(box!.x + 200, box!.y + 120)
  await page.mouse.up()

  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByText('Profile saved.')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('link', { name: 'Back to timesheets' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Timesheet' })).toBeVisible()
}
